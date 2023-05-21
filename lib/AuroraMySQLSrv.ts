import { CfnOutput, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { InstanceType, Port, Vpc } from "aws-cdk-lib/aws-ec2";
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDriver } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancer, ApplicationTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { AuroraMysqlEngineVersion, CfnDBCluster, DatabaseCluster, DatabaseClusterEngine } from "aws-cdk-lib/aws-rds";
import { PrivateHostedZone, SrvRecord } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

interface AuroraMySQLSrvProps {
    region: string,
    accountId: string,
    maxAzs: number,
}

export class AuroraMySQLSrv extends Stack {
    constructor(scope: Construct, id: string, props: AuroraMySQLSrvProps) {
        super(scope, id, {
            env: { account: props.accountId, region: props.region },
        });

        // ----------
        // networking for application stack
        // ----------
        const vpc = new Vpc(this, 'Vpc', { maxAzs: props.maxAzs });

        // ----------
        // relational database
        // ----------
        const rdbPort = 3306;
        const rdbCluster = new DatabaseCluster(vpc, 'RdbCluster', {
            engine: DatabaseClusterEngine.auroraMysql({ version: AuroraMysqlEngineVersion.VER_3_03_0 }),
            instanceProps: { vpc, instanceType: new InstanceType('serverless'), },
            // instances: vpc.availabilityZones.length,
            instances: 2, port: rdbPort,
        });
        (rdbCluster.node.defaultChild as CfnDBCluster).serverlessV2ScalingConfiguration = {
            minCapacity: 0.5, maxCapacity: 2,
        };

        // ----------
        // namespace for services
        // ----------
        const hostedZone = new PrivateHostedZone(this, 'PrivateHostedZone', { zoneName: 'myzone.local', vpc, });
        const rwRecord = new SrvRecord(hostedZone, 'MySQLWriterSrv', {
            recordName: '_readwrite._tcp.mysql', zone: hostedZone,
            values: [{
                priority: 1, weight: 1, port: rdbPort, hostName: rdbCluster.clusterEndpoint.hostname
            },],
        });
        const roRecord = new SrvRecord(hostedZone, 'MySQLReaderSrv', {
            recordName: '_readonly._tcp.mysql', zone: hostedZone,
            values: [{
                priority: 1, weight: 1, port: rdbPort, hostName: rdbCluster.clusterReadEndpoint.hostname
            },
                /*
                {
                    priority: 2, weight: 1, port: rdbPort, hostName: rdbCluster.clusterEndpoint.hostname
                },
                */
            ],
        });

        // ----------
        // application containers
        // ----------
        const containerPort = 8080;
        const listenerPort = 80;
        const taskDefinition = new FargateTaskDefinition(this, 'TaskDefinition', {
            cpu: 1024, memoryLimitMiB: 4096,
        });
        taskDefinition.addContainer('App', {
            image: ContainerImage.fromAsset(`${__dirname}/../app`),
            portMappings: [{ containerPort, }],
            environment: {
                RDB_RW_ENDPOINT: `${rwRecord.domainName}`,
                RDB_RO_ENDPOINT: `${roRecord.domainName}`,
                RDB_USERNAME: rdbCluster.secret!.secretValueFromJson('username').unsafeUnwrap(),
                RDB_PASSWORD: rdbCluster.secret!.secretValueFromJson('password').unsafeUnwrap(),
            },
            logging: LogDriver.awsLogs({
                streamPrefix: 'auroramysqlsrv-app', logGroup: new LogGroup(this, 'LogGroup', {
                    removalPolicy: RemovalPolicy.DESTROY, retention: RetentionDays.ONE_DAY,
                }),
            }),
        });

        const cluster = new Cluster(this, 'Cluster', { vpc });
        const app = new FargateService(cluster, 'AppService', {
            cluster, taskDefinition, desiredCount: 1,
            healthCheckGracePeriod: Duration.seconds(30),
        });
        const targetGroup = new ApplicationTargetGroup(vpc, 'TargetGroup', {
            targets: [app], vpc, port: containerPort,
            healthCheck: {
                path: '/actuator/health', interval: Duration.seconds(5), timeout: Duration.seconds(2),
                healthyThresholdCount: 2, unhealthyThresholdCount: 2,
            },
            deregistrationDelay: Duration.seconds(0),
        });
        rdbCluster.connections.allowFrom(app, Port.tcp(rdbPort));

        // ----------
        // application endpoints
        // ----------
        const alb = new ApplicationLoadBalancer(vpc, 'Alb', {
            vpc, internetFacing: true,
        });
        alb.addListener('Listener', { port: listenerPort, defaultTargetGroups: [targetGroup] });

        new CfnOutput(this, 'AppEndpoint', { value: `http://${alb.loadBalancerDnsName}:${listenerPort}/` });
    }
}
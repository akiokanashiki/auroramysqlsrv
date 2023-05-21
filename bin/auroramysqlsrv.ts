#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import 'source-map-support/register';
import { AuroraMySQLSrv } from '../lib/AuroraMySQLSrv';

const app = new App();
new AuroraMySQLSrv(app, 'AuroraMySQLServStack', {
  accountId: process.env.CDK_DEFAULT_ACCOUNT!, region: 'us-east-1', maxAzs: 3,
});
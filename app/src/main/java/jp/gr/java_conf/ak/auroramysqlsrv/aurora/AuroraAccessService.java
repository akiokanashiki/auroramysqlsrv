package jp.gr.java_conf.ak.auroramysqlsrv.aurora;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Scope(proxyMode = ScopedProxyMode.TARGET_CLASS)
public class AuroraAccessService {

    @Autowired
    private JdbcOperations jdbcOperations;

    @Transactional(readOnly = false)
    public Object accessInformationSchemaWithReadWrite() {
        return this.jdbcOperations.queryForList(
                "select @@hostname, @@read_only, @@innodb_read_only,"
                        + " server_id, last_update_timestamp "
                        + " from information_schema.replica_host_status"
                        + " where session_id = 'MASTER_SESSION_ID'");
    }

    @Transactional(readOnly = true)
    public Object accessInformationSchemaWithReadOnly() {
        return this.jdbcOperations.queryForList(
                "select @@hostname, @@read_only, @@innodb_read_only,"
                        + " server_id, last_update_timestamp "
                        + " from information_schema.replica_host_status"
                        + " where session_id = 'MASTER_SESSION_ID'");
    }
}

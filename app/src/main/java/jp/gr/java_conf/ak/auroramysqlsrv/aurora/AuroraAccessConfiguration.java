package jp.gr.java_conf.ak.auroramysqlsrv.aurora;

import java.sql.Connection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.LazyConnectionDataSourceProxy;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;
import org.springframework.lang.Nullable;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Configuration
public class AuroraAccessConfiguration {

    @Bean
    @Qualifier("rw")
    @ConfigurationProperties(prefix = "spring.datasource")
    public DataSourceProperties rwDSProps() {
        return new DataSourceProperties();
    }

    @Bean
    @Qualifier("ro")
    @ConfigurationProperties(prefix = "spring.ro.datasource")
    public DataSourceProperties roDSProps() {
        return new DataSourceProperties();
    }

    @Bean
    @Qualifier("rw")
    public DataSource rwDS(@Qualifier("rw") final DataSourceProperties rwDSProps) {
        return rwDSProps.initializeDataSourceBuilder().build();
    }

    @Bean
    @Qualifier("ro")
    public DataSource roDS(@Qualifier("ro") final DataSourceProperties roDSProps) {
        return roDSProps.initializeDataSourceBuilder().build();
    }

    @Bean
    @Qualifier("routing")
    public DataSource routingDS(@Qualifier("rw") final DataSource rwDS, @Qualifier("ro") final DataSource roDS) {

        final String RW = "RW";
        final String RO = "RO";
        final Map<String, DataSource> dsMap = new HashMap<>();
        dsMap.put(RW, rwDS);
        dsMap.put(RO, roDS);

        final AbstractRoutingDataSource router = new AbstractRoutingDataSource() {
            @Override
            @Nullable
            protected Object determineCurrentLookupKey() {
                return TransactionSynchronizationManager.isCurrentTransactionReadOnly() ? RO : RW;
            }
        };
        router.setTargetDataSources(Collections.unmodifiableMap(dsMap));
        return router;
    }

    @Bean
    @Qualifier("lazy")
    @Primary
    public DataSource lazyDS(@Qualifier("routing") final DataSource routingDS) {
        final LazyConnectionDataSourceProxy proxy = new LazyConnectionDataSourceProxy();
        proxy.setDefaultAutoCommit(false);
        proxy.setDefaultTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
        proxy.setTargetDataSource(routingDS);
        return proxy;
    }
}

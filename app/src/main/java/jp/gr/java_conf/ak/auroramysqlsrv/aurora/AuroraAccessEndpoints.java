package jp.gr.java_conf.ak.auroramysqlsrv.aurora;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/api/aurora")
public class AuroraAccessEndpoints {

    @Autowired
    private AuroraAccessService service;

    @GetMapping(path = "/replica_status_rw")
    public Object accessInformationSchemaWithReadWrite() {
        return this.service.accessInformationSchemaWithReadWrite();
    }

    @GetMapping(path = "/replica_status_ro")
    public Object accessInformationSchemaWithReadOnly() {
        return this.service.accessInformationSchemaWithReadOnly();
    }
}
package jp.gr.java_conf.ak.auroramysqlsrv;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;

@SpringBootApplication
public class Main {
   
    public static void main(final String...args) {
        new SpringApplicationBuilder(Main.class).run(args);
    }
}

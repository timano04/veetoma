package com.veetoma.coreapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class VeetomaCoreApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(VeetomaCoreApiApplication.class, args);
    }
}

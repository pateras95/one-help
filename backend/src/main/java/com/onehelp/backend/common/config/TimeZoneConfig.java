package com.onehelp.backend.common.config;

import jakarta.annotation.PostConstruct;
import java.util.TimeZone;
import org.springframework.context.annotation.Configuration;

/**
 * Pins the JVM's default time zone to UTC at startup, so any code that implicitly
 * relies on the platform default (rather than an explicit {@code Instant}/UTC clock)
 * still behaves correctly. This is one of three redundant UTC-pinning layers — the
 * others are the JDBC URL ({@code serverTimezone=UTC}) and Hibernate's own
 * {@code hibernate.jdbc.time_zone=UTC} setting — see database-schema.md § Time,
 * dates, and timezone policy.
 */
@Configuration
public class TimeZoneConfig {

    @PostConstruct
    public void pinJvmTimeZoneToUtc() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }
}

package com.onehelp.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Full Spring context load, including Flyway migrating against a real MySQL database
 * (application-test.yml, "test" profile) — this project deliberately uses no H2/
 * Testcontainers, so this test requires an actual reachable MySQL instance and is
 * expected to fail (not silently pass) if one isn't available. See
 * docs/reports/2026-08-06-mysql-backend-foundation.md § Tests Result for whether this
 * ran in a given environment.
 */
@SpringBootTest
@ActiveProfiles("test")
class OneHelpBackendApplicationTests {

    @Test
    void contextLoads() {
        // Intentionally empty: a successful context load (including Flyway
        // validating the V1 migration against a real MySQL schema) is the assertion.
    }
}

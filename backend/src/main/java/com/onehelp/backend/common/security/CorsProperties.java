package com.onehelp.backend.common.security;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Allowed frontend origins for CORS, sourced from {@code CORS_ALLOWED_ORIGINS}
 * (comma-separated). Never a wildcard together with credentials, per
 * security-and-authentication.md § CORS and CSRF policy.
 */
@Validated
@ConfigurationProperties(prefix = "onehelp.cors")
public class CorsProperties {

    @NotEmpty
    private List<String> allowedOrigins;

    public List<String> getAllowedOrigins() {
        return allowedOrigins;
    }

    public void setAllowedOrigins(List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }
}

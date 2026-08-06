package com.onehelp.backend.common.security;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * JWT configuration, sourced entirely from environment variables (never a committed
 * secret — see ADR-2). {@code secret} must be at least 32 characters (256 bits), the
 * minimum HS256 requires; validation runs at startup so a misconfigured secret fails
 * fast rather than producing a runtime signing error later.
 *
 * <p>Only the configuration shape lives here in this foundation phase — the actual
 * token-signing component ({@code TokenSigner}, ADR-2) is introduced by the
 * authentication phase that implements login/register/refresh.
 */
@Validated
@ConfigurationProperties(prefix = "onehelp.jwt")
public class JwtProperties {

    @NotBlank
    @Size(min = 32, message = "JWT_SECRET must be at least 32 characters (256 bits) for HS256")
    private String secret;

    @Min(1)
    private int accessTokenTtlMinutes = 15;

    @Min(1)
    private int refreshTokenTtlDays = 30;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public int getAccessTokenTtlMinutes() {
        return accessTokenTtlMinutes;
    }

    public void setAccessTokenTtlMinutes(int accessTokenTtlMinutes) {
        this.accessTokenTtlMinutes = accessTokenTtlMinutes;
    }

    public int getRefreshTokenTtlDays() {
        return refreshTokenTtlDays;
    }

    public void setRefreshTokenTtlDays(int refreshTokenTtlDays) {
        this.refreshTokenTtlDays = refreshTokenTtlDays;
    }
}

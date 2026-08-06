package com.onehelp.backend.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers the shared {@code bearerAuth} security scheme once for future
 * non-public controllers to reference via {@code @SecurityRequirement} — no endpoint
 * exists yet in this phase, so nothing references it. Enabled only under the
 * {@code local} profile (see application-local.yml); disabled elsewhere.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_AUTH_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI oneHelpOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("OneHelp API")
                        .version("v1")
                        .description("OneHelp backend REST API. This foundation phase exposes no "
                                + "business endpoints yet — only /actuator/health and this OpenAPI "
                                + "document itself."))
                .components(new Components()
                        .addSecuritySchemes(
                                BEARER_AUTH_SCHEME,
                                new SecurityScheme()
                                        .name(BEARER_AUTH_SCHEME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }
}

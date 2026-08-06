package com.onehelp.backend.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onehelp.backend.common.web.ApiErrorResponse;
import com.onehelp.backend.common.web.TraceIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * Renders an unauthenticated request as the standard {@link ApiErrorResponse} shape
 * ({@code common.unauthenticated}, 401) instead of Spring Security's default empty
 * 403 body — matches error-contract.md's "Not authenticated → 401" rule exactly.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(
            HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        String traceId = TraceIdFilter.currentTraceId();
        ApiErrorResponse body = ApiErrorResponse.of(
                HttpStatus.UNAUTHORIZED.value(),
                "common.unauthenticated",
                "Authentication is required to access this resource.",
                traceId);
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), body);
    }
}

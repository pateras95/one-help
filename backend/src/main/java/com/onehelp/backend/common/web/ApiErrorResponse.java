package com.onehelp.backend.common.web;

import java.time.Instant;
import java.util.Map;

/**
 * The standard error response shape for every API error, per
 * docs/backend-architecture/error-contract.md. Never includes a stack trace, an
 * exception class name, a SQL fragment, or a constraint name — {@code message} is
 * always a safe, generic, human-readable fallback; {@code code} is the stable,
 * machine-readable, dot-namespaced value clients actually branch on.
 */
public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String code,
        String message,
        Map<String, String> fieldErrors,
        String traceId) {

    public static ApiErrorResponse of(int status, String code, String message, String traceId) {
        return new ApiErrorResponse(Instant.now(), status, code, message, null, traceId);
    }

    public static ApiErrorResponse ofValidation(
            int status, String code, String message, Map<String, String> fieldErrors, String traceId) {
        return new ApiErrorResponse(Instant.now(), status, code, message, fieldErrors, traceId);
    }
}

package com.onehelp.backend.common.exception;

import com.onehelp.backend.common.web.ApiErrorResponse;
import com.onehelp.backend.common.web.TraceIdFilter;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Translates every exception reaching a controller into the standard
 * {@link ApiErrorResponse} shape from docs/backend-architecture/error-contract.md.
 * Never lets a stack trace, exception class name, SQL fragment, or constraint name
 * reach the client — every unrecognized exception becomes a generic 500 with code
 * {@code common.unexpectedError}, logged server-side at ERROR with the trace id.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ApiErrorResponse> handleDomainException(DomainException ex) {
        String traceId = TraceIdFilter.currentTraceId();
        log.warn("Domain exception [{}] code={} traceId={}", ex.getStatus(), ex.getCode(), traceId, ex);
        ApiErrorResponse body =
                ApiErrorResponse.of(ex.getStatus().value(), ex.getCode(), ex.getMessage(), traceId);
        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String traceId = TraceIdFilter.currentTraceId();
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        log.warn("Validation failure traceId={} fields={}", traceId, fieldErrors.keySet());
        ApiErrorResponse body = ApiErrorResponse.ofValidation(
                HttpStatus.UNPROCESSABLE_ENTITY.value(),
                "validation.failed",
                "One or more fields are invalid.",
                fieldErrors,
                traceId);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(body);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        String traceId = TraceIdFilter.currentTraceId();
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {
            fieldErrors.put(violation.getPropertyPath().toString(), violation.getMessage());
        }
        log.warn("Constraint violation traceId={} fields={}", traceId, fieldErrors.keySet());
        ApiErrorResponse body = ApiErrorResponse.ofValidation(
                HttpStatus.UNPROCESSABLE_ENTITY.value(),
                "validation.failed",
                "One or more fields are invalid.",
                fieldErrors,
                traceId);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(body);
    }

    /**
     * A malformed request body — most commonly an invalid enum literal (e.g. an
     * {@code organizationType}/{@code category} value that isn't one of the accepted
     * constants, error-contract.md's "enum binding failure is a 422 automatically"
     * rule) — throws this from Jackson deserialization, before {@code @Valid} ever
     * runs. Without this handler it would fall through to {@link #handleUnexpected}
     * and leak a raw 500 for what is really a client input error.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleMalformedRequest(HttpMessageNotReadableException ex) {
        String traceId = TraceIdFilter.currentTraceId();
        log.warn("Malformed request body traceId={}", traceId);
        ApiErrorResponse body = ApiErrorResponse.of(
                HttpStatus.UNPROCESSABLE_ENTITY.value(),
                "validation.failed",
                "The request body is malformed or contains an invalid value.",
                traceId);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(body);
    }

    /**
     * {@code @PreAuthorize} method-security failures throw this from inside the
     * controller-invocation call stack — {@code @RestControllerAdvice}'s
     * {@code HandlerExceptionResolver} resolves it here, inside the servlet dispatch,
     * before it would ever reach {@code SecurityConfig}'s filter-level
     * {@code RestAccessDeniedHandler} (which only ever sees a URL-level
     * {@code authorizeHttpRequests} rejection, never a method-security one). Without
     * this explicit handler, {@link #handleUnexpected} would catch it instead and
     * return a misleading 500 for what is actually a normal 403.
     */
    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAuthorizationDenied(AuthorizationDeniedException ex) {
        String traceId = TraceIdFilter.currentTraceId();
        log.warn("Authorization denied traceId={}", traceId);
        ApiErrorResponse body = ApiErrorResponse.of(
                HttpStatus.FORBIDDEN.value(),
                "common.forbidden",
                "You do not have permission to access this resource.",
                traceId);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
        String traceId = TraceIdFilter.currentTraceId();
        log.error("Unexpected exception traceId={}", traceId, ex);
        ApiErrorResponse body = ApiErrorResponse.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "common.unexpectedError",
                "An unexpected error occurred. Please try again later.",
                traceId);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}

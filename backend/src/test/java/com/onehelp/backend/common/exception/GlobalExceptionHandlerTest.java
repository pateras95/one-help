package com.onehelp.backend.common.exception;

import static org.assertj.core.api.Assertions.assertThat;

import com.onehelp.backend.common.web.ApiErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Pure unit tests of the exception → {@link ApiErrorResponse} translation — no Spring
 * context, no database. Confirms the response never leaks an internal detail.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void domainExceptionMapsToItsOwnStatusAndCode() {
        DomainException ex = new TestDomainException();

        ResponseEntity<ApiErrorResponse> response = handler.handleDomainException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        ApiErrorResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.code()).isEqualTo("test.conflict");
        assertThat(body.message()).isEqualTo("A safe, generic message.");
        assertThat(body.status()).isEqualTo(409);
        assertThat(body.traceId()).isNotBlank();
    }

    @Test
    void unexpectedExceptionNeverLeaksInternalDetail() {
        RuntimeException ex = new RuntimeException("password=hunter2; SELECT * FROM users");

        ResponseEntity<ApiErrorResponse> response = handler.handleUnexpected(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        ApiErrorResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.code()).isEqualTo("common.unexpectedError");
        assertThat(body.message()).doesNotContain("password", "SELECT", "RuntimeException");
    }

    private static final class TestDomainException extends DomainException {
        TestDomainException() {
            super("test.conflict", HttpStatus.CONFLICT, "A safe, generic message.");
        }
    }
}

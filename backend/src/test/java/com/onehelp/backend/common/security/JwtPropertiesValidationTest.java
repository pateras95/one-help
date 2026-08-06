package com.onehelp.backend.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Validates {@link JwtProperties}' Bean Validation constraints directly (Jakarta
 * Validator, no Spring context, no database) — proves a short/blank {@code JWT_SECRET}
 * is rejected before the application ever attempts to sign a token with it.
 */
class JwtPropertiesValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    void rejectsSecretShorterThan32Characters() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("too-short");

        Set<ConstraintViolation<JwtProperties>> violations = validator.validate(properties);

        assertThat(violations).isNotEmpty();
    }

    @Test
    void rejectsBlankSecret() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(" ");

        Set<ConstraintViolation<JwtProperties>> violations = validator.validate(properties);

        assertThat(violations).isNotEmpty();
    }

    @Test
    void acceptsA32CharacterSecret() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("a".repeat(32));

        Set<ConstraintViolation<JwtProperties>> violations = validator.validate(properties);

        assertThat(violations).isEmpty();
    }
}

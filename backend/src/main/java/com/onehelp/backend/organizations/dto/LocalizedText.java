package com.onehelp.backend.organizations.dto;

/** Response-side bilingual field shape (ADR-9) — {@code el}/{@code en}, no validation
 * (validation lives on the dedicated request-side {@link LocalizedNameRequest}/
 * {@link LocalizedDescriptionRequest} types instead). */
public record LocalizedText(String el, String en) {}

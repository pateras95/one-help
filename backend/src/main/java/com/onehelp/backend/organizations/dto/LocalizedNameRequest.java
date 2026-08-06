package com.onehelp.backend.organizations.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code organizations.name_el}/{@code name_en} — each independently required and
 * validated (ADR-9 — the backend never auto-copies one language into the other). */
public record LocalizedNameRequest(
        @NotBlank @Size(min = 2, max = 120) String el, @NotBlank @Size(min = 2, max = 120) String en) {}

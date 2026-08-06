package com.onehelp.backend.organizations.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code organizations.description_el}/{@code description_en} — each independently
 * required and validated (ADR-9). */
public record LocalizedDescriptionRequest(
        @NotBlank @Size(min = 20, max = 2000) String el, @NotBlank @Size(min = 20, max = 2000) String en) {}

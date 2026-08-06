package com.onehelp.backend.organizations.entity;

/**
 * An organization's self-declared focus areas. Descriptive attribute, no transitions.
 * Matches the frontend's {@code constants/actionCategories.js} ids exactly, and is the
 * same value set the future Actions module's {@code ActionCategory} enum will use
 * (docs/backend-architecture/domain-model-and-state-machines.md) — defined here first
 * since Actions is out of scope for this phase, not duplicated once Actions exists.
 */
public enum OrganizationCategory {
    EMERGENCY,
    HEALTH,
    ENVIRONMENT,
    SOCIAL,
    ANIMALS
}

package com.onehelp.backend.organizations.entity;

/** Descriptive attribute, no transitions. Matches the frontend's
 * {@code constants/organizationTypes.js} ids exactly (camelCase id -> SNAKE_CASE enum). */
public enum OrganizationType {
    NGO,
    MUNICIPALITY,
    HEALTH_ORGANIZATION,
    VOLUNTEER_GROUP,
    ANIMAL_WELFARE,
    EDUCATIONAL_INSTITUTION,
    COMMUNITY_ASSOCIATION,
    OTHER
}

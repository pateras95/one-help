/**
 * Persistence conventions shared across every domain module.
 *
 * <ul>
 *   <li><b>UUID strategy</b>: every primary key is a Java {@code UUID} generated in
 *       application code ({@code UUID.randomUUID()}), stored as {@code CHAR(36)} via
 *       {@link com.onehelp.backend.common.persistence.UuidCharAttributeConverter}.
 *       MySQL has no native UUID type or {@code gen_random_uuid()} function.</li>
 *   <li><b>Timestamp strategy</b>: every instant is stored as UTC in a
 *       {@code DATETIME(6)} column and mapped to a Java {@code Instant}. The JDBC
 *       connection, Hibernate, and the JVM's default time zone are all pinned to UTC
 *       (see {@code common.config}) so no layer silently reintroduces server-local
 *       time. See {@code docs/backend-architecture/database-schema.md} § Time, dates,
 *       and timezone policy.</li>
 * </ul>
 */
package com.onehelp.backend.common.persistence;

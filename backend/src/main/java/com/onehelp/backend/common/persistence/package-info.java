/**
 * Persistence conventions shared across every domain module.
 *
 * <ul>
 *   <li><b>UUID strategy</b>: every primary key is a Java {@code UUID} generated in
 *       application code ({@code UUID.randomUUID()}), stored as {@code CHAR(36)} via
 *       {@code @JdbcTypeCode(SqlTypes.CHAR)} on the id field (Hibernate's own native
 *       CHAR dispatch for {@code UUID} attributes — a plain JPA
 *       {@code @Convert(...)} does not reliably apply to {@code @Id} fields per the
 *       JPA spec, which silently let MySQL Connector/J write the UUID's raw binary
 *       form instead of its string form; caught and fixed once a real insert was
 *       exercised in the authentication phase). MySQL has no native UUID type or
 *       {@code gen_random_uuid()} function.</li>
 *   <li><b>Timestamp strategy</b>: every instant is stored as UTC in a
 *       {@code DATETIME(6)} column and mapped to a Java {@code Instant}. The JDBC
 *       connection, Hibernate, and the JVM's default time zone are all pinned to UTC
 *       (see {@code common.config}) so no layer silently reintroduces server-local
 *       time. See {@code docs/backend-architecture/database-schema.md} § Time, dates,
 *       and timezone policy.</li>
 * </ul>
 */
package com.onehelp.backend.common.persistence;

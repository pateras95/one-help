package com.onehelp.backend.common.persistence;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.UUID;

/**
 * Maps a {@link UUID} field to a {@code CHAR(36)} column holding its canonical
 * hyphenated text form, e.g. {@code 3fa85f64-5717-4562-b3fc-2c963f66afa6}.
 *
 * MySQL has no native UUID column type, so every table's UUID primary key is stored
 * as CHAR(36) rather than BINARY(16) — chosen for readability/debuggability over the
 * smaller storage footprint BINARY(16) would give (see database-schema.md § UUID
 * strategy). Apply this converter to every UUID-typed identifier field so the mapping
 * stays consistent across entities.
 */
@Converter
public class UuidCharAttributeConverter implements AttributeConverter<UUID, String> {

    @Override
    public String convertToDatabaseColumn(UUID attribute) {
        return attribute == null ? null : attribute.toString();
    }

    @Override
    public UUID convertToEntityAttribute(String dbData) {
        return dbData == null ? null : UUID.fromString(dbData);
    }
}

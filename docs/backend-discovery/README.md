# OneHelp Backend Discovery — Documentation Index

This folder is the output of a **documentation-only** reverse-engineering pass over the
frozen OneHelp frontend (`frontend/src`). Its purpose is to describe, with file-level
precision, exactly how the current mock/localStorage-backed frontend behaves, so a future
Spring Boot backend can reproduce the same behavior and replace the mock layer
incrementally, one feature at a time, without requiring frontend component rewrites.

No application code was modified to produce these documents. No backend, database
schema, or API was designed here — that is deliberately left to the next phase (see
"Suggested Next Feature" in the phase report).

Related pre-existing documents worth knowing about (not created by this pass, but
overlapping in scope and cross-referenced below):

- `docs/future-backend-data-model.md` — a short prior reference note on entity
  relationships and the organizer-demotion cascade. This discovery confirms and expands
  on it with exact file/function citations.
- `claude.md` (repo root) — the frontend's permanent project rules (permanently excluded
  features, the one-organizer-one-organization rule, tech stack constraints).

## Recommended reading order

1. **`frontend-mock-inventory.md`** — start here. Complete inventory of every mock,
   storage module, service, and Pinia store, plus the domain dependency map and the
   localStorage key inventory. This is the map of "where everything lives."
2. **`domain-models.md`** — the current data shapes (User, Action, Organization,
   Participation, Attendance, QR Token, Report, etc.) and every enum/lifecycle status,
   extracted directly from the mock fixtures and storage validators.
3. **`service-contracts.md`** — every frontend service method, its consumers, and its
   likely future backend responsibility (endpoint, method, request/response shape).
4. **`business-rules.md`** — the consolidated rulebook: permissions, lifecycle
   transitions, visibility policy, validation, and the cascade/referential-integrity map
   for destructive operations (organizer demotion, suspension, moderation).
5. **`routes-and-authorization.md`** — the full route table, the guard logic, and the
   role × route matrix.
6. **`frontend-backend-replacement-map.md`** — how to introduce the backend
   domain-by-domain while keeping the app runnable, including the recommended
   implementation order and the local dev integration strategy (`VITE_DATA_SOURCE`,
   proxying, CORS).
7. **`risks-and-open-decisions.md`** — read this last, but do not skip it. Every
   inconsistency, duplicated source of truth, frontend-only assumption, and open
   question that must be resolved before schema/API design begins.

## Scope reminders (carried over from `claude.md` and the discovery brief)

- Certificates, exports (CSV/Excel/PDF), payments, and donations remain permanently
  out of scope — not mentioned anywhere in these documents as future work.
- The organization ownership rule is permanent: one organizer owns exactly one
  organization, one organization has exactly one organizer, no manager role, no
  multiple organizers. Every document below preserves this rule as-is.
- Vitest and automated test tooling were not part of this discovery pass.

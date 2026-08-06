# Phase Report — Frontend Mock System Discovery & Backend Contract Inventory

## Summary

Completed a documentation-only reverse-engineering pass over the entire frozen
OneHelp frontend (`frontend/src`, ~150 files) to produce a complete map of the mock
architecture ahead of Spring Boot backend design. Seven parallel research agents each
read their assigned domain's files in full (not excerpts) and cross-checked their
findings against independent repo-wide greps for localStorage keys, Pinia store ids,
and route/guard metadata performed directly in this session. Findings were synthesized
into eight documentation files covering the mock/storage/service/store inventory,
domain models and enums, service contracts, business rules and cascade behavior,
routing/authorization, the replacement map with recommended implementation order, and
open risks/decisions. No application code, styles, translations, package files, or
Git configuration was modified.

## Documentation Files Created

- `docs/backend-discovery/README.md` — index and recommended reading order.
- `docs/backend-discovery/frontend-mock-inventory.md` — mocks, storage modules,
  services, Pinia stores, the 16-key localStorage inventory, and the domain
  dependency map.
- `docs/backend-discovery/domain-models.md` — every current data model's fields
  (User, Auth Session, Organization/Application, Membership, Action, Participation,
  Attendance, QR Token/Session, Report, Action Moderation, Admin Activity Entry) plus
  the full enum/lifecycle inventory.
- `docs/backend-discovery/service-contracts.md` — every frontend service method,
  its consumers, error codes, and recommended future HTTP method/endpoint.
- `docs/backend-discovery/business-rules.md` — the consolidated rule catalogue
  (auth, organizations, actions, participation, attendance/QR, reports, admin) and
  the full cascade/referential-integrity map for the organizer-demotion operation and
  other destructive operations.
- `docs/backend-discovery/routes-and-authorization.md` — the complete route
  catalogue, the guard logic (quoted verbatim), and the role × route matrix.
- `docs/backend-discovery/frontend-backend-replacement-map.md` — the mock-to-API
  replacement matrix, the verified-safe incremental implementation order, and the
  local dev integration strategy (`VITE_DATA_SOURCE`, CORS, proxy options).
- `docs/backend-discovery/risks-and-open-decisions.md` — 31 classified findings
  (critical / architecture decision / safe to defer / frontend-only).

## Files Modified

None.

## Files Removed

None.

## Folder Structure

```
docs/
└── backend-discovery/
    ├── README.md
    ├── frontend-mock-inventory.md
    ├── domain-models.md
    ├── service-contracts.md
    ├── business-rules.md
    ├── routes-and-authorization.md
    ├── frontend-backend-replacement-map.md
    └── risks-and-open-decisions.md
```

## Packages Installed

None.

## Build Result

Not run — no application code was changed, and the task explicitly excluded running
build/lint tooling unless documentation tooling unexpectedly modified application
files (it did not).

## Lint Result

Not run — not applicable to a documentation-only phase.

## Test Result

Not run — not applicable to a documentation-only phase.

## Manual Verification

- `git diff --name-only` shows no modified tracked files; `git status --short` shows
  only the new `docs/backend-discovery/` directory as untracked (plus a pre-existing
  unrelated `package-lock.json` from before this session).
- Cross-verified the localStorage key inventory (16 keys) via an independent
  repo-wide `grep` for every `STORAGE_KEY`/`*_STORAGE_KEY` constant, separate from the
  research agents' own findings — both sources agree exactly.
- Cross-verified all 12 Pinia store ids via an independent `grep` for `defineStore(`.
- Cross-verified the full route table and guard logic by directly reading
  `router/index.js`, `router/authGuard.js`, `router/routes/public.routes.js`, every
  feature `routes.js`, and `constants/roles.js` in this session, in addition to the
  dedicated research agent's findings.
- No passwords, full tokens, or raw QR token values appear anywhere in the generated
  documentation — QR tokens are described by format/entropy only; the one place a
  password fixture is discussed, only structural facts ("plaintext in fixture, never
  returned by the service") are stated, never a literal credential value.
- Every business rule, enum, and service contract entry cites the specific file (and
  in most cases the specific function) it was extracted from.

## Remaining TODO

None for this phase. Ambiguous/undecided behaviors were not resolved — they were
deliberately routed into `risks-and-open-decisions.md` per the discovery brief's
instructions, to be resolved during backend architecture design rather than guessed at
here.

## Suggested Next Feature

OneHelp Backend Architecture, Database Schema & REST API Design

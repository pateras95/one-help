# Phase Report — OneHelp Local Development Guide (README_LOCAL.md)

## Summary

Created `backend/README_LOCAL.md`, a complete, copy-paste-friendly local development
guide covering the whole project (frontend + backend + MySQL + optional phpMyAdmin),
written for a developer who has never seen the repository before. Documentation only —
no source code, configuration, or package file was modified. Every fact in the guide
(ports, commands, variable names, folder layout, Flyway conventions) was verified
against the actual current state of the repository rather than assumed, which surfaced
one real, pre-existing problem worth flagging: **the frontend's dev server
(`vite.config.js`) and the backend (`application.yml`) are both configured for port
`8080`**, so running both at once fails on a fresh clone. This isn't something this
phase is scoped to fix (no configuration changes allowed), so it's documented plainly
in §6, §12, and §14 of the guide, with a non-destructive command-line workaround
(`npm run dev -- --port 5173`) instead of an unused/silent gap.

## Files Created

- `backend/README_LOCAL.md` — the local development guide (15 sections, as specified).
- `docs/reports/2026-08-06-readme-local.md` — this report.

## Files Modified

None.

## Files Removed

None.

## Folder Structure

No structural change. `backend/README_LOCAL.md` sits alongside the existing
`backend/README.md` (which stays focused on the backend project itself; the new file
is the project-wide, from-scratch onboarding guide).

## Packages Installed

None.

## Build Result

Not applicable — no code changed. No build was run for this phase (the backend build
was already verified end-to-end in the immediately preceding phase,
`docs/reports/backend-local-verification.md`).

## Lint Result

Not applicable — no source file was touched.

## Test Result

Not applicable — no source file was touched.

## Manual Verification

Every claim in the guide was checked against the live repository/environment before
being written down, not assumed from memory:

| Claim in the guide | Verified against |
|---|---|
| Frontend dev server port | `frontend/vite.config.js` → `server.port: 8080` (not Vite's 5173 default) |
| Backend port | `backend/src/main/resources/application.yml` → `server.port: 8080` |
| Port conflict between the two | Both confirmed to be `8080` — flagged explicitly rather than glossed over |
| Node version requirement | `frontend/package.json` (`engines.node: ">=22"`) and `frontend/.nvmrc` (`22`) |
| npm scripts (`dev`, `build`, `lint`, `preview`) | `frontend/package.json` |
| Backend env vars (`DB_HOST/PORT/NAME/USERNAME/PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`) | `backend/.env.example` and `application.yml`'s `${...}` placeholders |
| Frontend env vars (`VITE_API_BASE_URL`, `VITE_MAP_TILE_URL`) | `frontend/.env.example` |
| Flyway migration filename/location/naming convention | `backend/src/main/resources/db/migration/V1__foundation_and_auth_schema.sql` |
| Swagger/Actuator/health URLs and `local`-profile gating | `application.yml` vs `application-local.yml`, and the live run performed in the previous verification phase |
| MySQL service management commands | `systemctl status/start mysql`, confirmed working in the previous phase |
| Maven Wrapper usage | `backend/mvnw` present and executable; confirmed working in the previous phase |
| phpMyAdmin is *not* part of this repo | `compose.yml` reviewed — it defines only a `mysql` service, no `phpmyadmin` service anywhere in the project |

**On phpMyAdmin specifically**: this sandbox happens to have the `phpmyadmin` OS
package installed, but it is not enabled as a project dependency, has no
project-specific config, and is not wired to run automatically — it's an
incidental fact of this one machine, not something every developer's clone will have.
The guide therefore documents phpMyAdmin as genuinely optional, with a standard
`apt install phpmyadmin` path and an honest "the exact URL depends on your web server
setup" rather than inventing a specific URL/port that wouldn't be true on a different
machine.

## Remaining TODO

- The port-8080 collision between `frontend/vite.config.js` and
  `backend/application.yml` is a real configuration inconsistency in the project
  itself (not introduced by this phase). It's documented with a workaround in the
  guide, but the actual fix — picking distinct default ports for the two, or updating
  `CORS_ALLOWED_ORIGINS`/`VITE_API_BASE_URL` to match a chosen pair — would require a
  configuration change, which is out of scope for this documentation-only phase.
- The repository root `README.md` still describes a planned stack (TypeScript,
  PostgreSQL, a `deployment/` folder) that no longer matches what's actually built
  (JavaScript, MySQL, no `deployment/` folder yet). Not touched here — out of scope —
  but worth reconciling in a future documentation pass, similar to the still-open
  `claude.md` staleness noted in the prior two reports.

## Suggested Next Feature

OneHelp Backend Authentication — Registration, Login, JWT Access Tokens, Refresh Token
Rotation, Logout, Current User & First Frontend API Integration (unchanged from the
previous phase's recommendation — this phase was documentation-only and doesn't change
what's next).

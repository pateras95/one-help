# Future Backend Data Model (Reference Only)

This is a concise reference for the entity relationships the current frontend mocks stand in for, and the invariants a real backend must preserve. No backend, ORM, or SQL exists yet — this is documentation only.

## Entities and relationships

- **User** — an account (`volunteer` | `organizer` | `administrator`). Has zero or one **Organization**, via ownership, never more than one.
- **Organization** — a volunteering entity. Has exactly one owning **User** (`organizerUserId` in the current mock). Has zero or more **Actions**.
- **Action** — a volunteering activity, owned by exactly one **Organization** (transitively, one **User**). Has zero or more **Participations**, **Attendance** records, **Reports**, and one moderation record.
- **Participation** — a volunteer **User**'s relationship to one **Action** (confirmed/cancelled).
- **Attendance** — a check-in/out record tied to one **Participation** and one **Action**.
- **Report** — a volunteer's report about one **Action**.

```
User (organizer) 1 ── 1 Organization 1 ── * Action 1 ── * Participation
                                              │              │
                                              │              └── 1 Attendance (per participation)
                                              ├── * Report
                                              └── 1 ModerationRecord
```

## Permanent rule: one organizer per organization, one organization per organizer

This is a **permanent product rule**, not a current-phase simplification (see `CLAUDE.md`'s "Permanent organization ownership rule"). A real schema should enforce it with a unique constraint on `Organization.organizerUserId` (or equivalently, a unique foreign key on whichever side owns the relationship) — never a many-to-many join table. There is no "manager" or "team member" concept to model; do not add one.

## Cascade delete / demotion must be transactional

The frontend's `demoteOrganizerToVolunteer(userId, initiatedBy)` (see `src/features/organizerApplication/services/organizerDemotion.service.js`) is the mock stand-in for what must become a single database transaction in a real backend:

1. Delete all `Participation` rows for the organizer's `Action`s.
2. Delete all `Attendance` rows for those same `Action`s.
3. Delete all `Report` rows for those same `Action`s.
4. Delete all moderation records for those same `Action`s.
5. Delete the `Action`s themselves.
6. Delete the `Organization`.
7. Revert the `User`'s role to `volunteer`.

All seven steps must succeed or none must apply — a partial cascade (e.g. actions deleted but the organization row left behind) would leave the data model in a state the application's invariants don't allow. The frontend mock approximates this by running the steps synchronously in-memory/localStorage, but a real backend must use an actual database transaction (or equivalent saga/outbox pattern if the data spans services).

Never delete the `User` account itself as part of this operation — only its role and organization-owned data.

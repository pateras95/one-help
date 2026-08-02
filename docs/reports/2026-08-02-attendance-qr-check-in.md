# Phase Report — Attendance Management & QR Check-In

## Summary

Built a full mocked attendance and QR check-in system on top of the existing Actions, Participation, and Organizer Action Management features: a feature-oriented `src/features/attendance/` structure (mocks, service, Pinia store, utils, views, routes), a stable `ATTENDANCE_STATUS` (`notCheckedIn`/`checkedIn`/`checkedOut`) and `CHECK_IN_METHOD` (`qr`/`manual`) model kept distinct from `PARTICIPATION_STATUS`, and `localStorage`-backed persistence under `onehelp.attendance` (attendance records) and `onehelp.attendance.qrSession` (organizer QR sessions), both referencing `participationId`/`actionId`/`userId` rather than duplicating identity data. Organizers get a real QR check-in screen (`/organizer/actions/:actionId/check-in`) with a live, expiring, regeneratable QR code plus manual check-in/check-out wired into the existing participant list. Volunteers get a protected `/check-in` screen supporting camera scanning, manual code entry, and a `?token=` deep link that survives a login round-trip. Also updated `claude.md` with a permanent, explicit exclusion list (certificates, exports, payments, donations) per the project's standing scope rules — see below. No backend, real cryptographic signing, JWT tokens, or any of the explicitly excluded features were touched.

**Permanent scope update:** added a new "Permanently excluded features" section to `claude.md` (right after the project overview) listing certificates, certificate generation, PDF certificates, all export formats, payments, donations, and payment integrations as never to be implemented, stubbed, or suggested again — including in future "Suggested Next Feature" sections. No prior documentation mentioned these as planned, so nothing needed removing, only the new explicit exclusion.

**Chosen check-in eligibility window policy:** a shared `checkInWindow.js` defines a real date-math window (opens 30 minutes before an action's scheduled start, closes 180 minutes after) via actual `Date` comparisons, never string comparisons. This window is **informational only** — it drives a notice banner on the organizer's QR screen, not a hard block anywhere in the service. The only hard, always-enforced rule is that a check-in (QR or manual) is only accepted for a `published` action; `draft`/`closed`/`cancelled` actions never accept new check-ins, regardless of date. This is a deliberate, explicitly documented choice: every mock action's date is generated relative to "today" (see the prior participation feature's report) and is always several days out, so a real backend's strict window would make check-in permanently untestable against this fixture data. The organizer opening the check-in screen is treated as the real-world "I am here, checking people in now" override the spec explicitly allows — the window's role is to surface an honest heads-up, not to silently pretend the mismatch doesn't exist.

**QR package choices:** the project had no existing QR utility. For **generation** (organizer side), installed `qrcode` (v1.5.4, actively maintained, the standard JS QR-generation library) — used via `QRCode.toDataURL()` to render the token straight to an `<img>`, no canvas plumbing needed. For **scanning** (volunteer side), installed `vue-qrcode-reader` (v5.7.3, actively maintained, purpose-built for Vue 3, MIT-licensed) — its `<QrcodeStream>` component owns all camera permission handling and frame decoding internally, so no custom low-level camera/decode code was written; only its `detect`/`error`/`camera-on` events are consumed. Both are single, minimal, maintained dependencies, one per concern, matching the task's "install only one package" (per generation) and "one maintained minimal library" (per scanning) guidance.

## Files Created

- `frontend/src/features/attendance/utils/attendanceStatus.js` — `ATTENDANCE_STATUS`, `CHECK_IN_METHOD`, `getAttendanceStatus()`
- `frontend/src/features/attendance/utils/attendanceErrors.js` — `ATTENDANCE_ERROR` codes + `attendanceErrorKey()`
- `frontend/src/features/attendance/utils/checkInWindow.js` — `CHECK_IN_WINDOW` config + `isWithinCheckInWindow()`
- `frontend/src/features/attendance/utils/qrToken.js` — mocked (unsigned) QR token: `createQrTokenPayload`, `encodeQrToken`, `decodeQrToken`, `isTokenExpired`
- `frontend/src/features/attendance/mocks/attendance.storage.js` — validates/repairs `onehelp.attendance`
- `frontend/src/features/attendance/mocks/qrSession.storage.js` — validates/repairs `onehelp.attendance.qrSession` (one active session per action)
- `frontend/src/features/attendance/services/attendance.service.js` — `getActionAttendance`, `getUserAttendance`, `getAttendanceByParticipation`, `checkInByQr`, `checkInManually`, `checkOut`, `getActiveCheckInSession`, `generateCheckInSession`, `validateCheckInToken`
- `frontend/src/features/attendance/stores/attendance.store.js` — volunteer's own attendance history (auto-loaded) + organizer's per-action attendance/QR-session view state (loaded on demand)
- `frontend/src/features/attendance/views/OrganizerCheckInView.vue` — QR screen: live code, countdown, regenerate, summary counts, window notice, link to participants
- `frontend/src/features/attendance/views/CheckInView.vue` — volunteer scan screen: camera/manual tabs, deep-link (`?token=`) auto-validation, confirm/success/error states
- `frontend/src/features/attendance/routes.js`
- `frontend/src/locales/el/attendance.js`, `frontend/src/locales/en/attendance.js`

## Files Modified

- `claude.md` — added the "Permanently excluded features" section described above
- `frontend/package.json`, `frontend/package-lock.json` — added `qrcode` and `vue-qrcode-reader`
- `frontend/src/features/participation/services/participation.service.js` — added `getParticipationById(participationId)` (attendance references participations by id, not by user+action)
- `frontend/src/features/organizer/views/OrganizerParticipantsView.vue` — each real participant row now shows attendance status, checked-in/out time, and manual check-in / check-out buttons where eligible; added a "QR Check-In" link
- `frontend/src/features/organizer/views/OrganizerActionDetailsView.vue` — added checked-in count and a "QR Check-In" quick action (published actions only)
- `frontend/src/features/organizer/views/OrganizerDashboardView.vue` — wired the card's new `check-in` event to navigate to the QR screen
- `frontend/src/features/organizer/components/OrganizerActionCard.vue` — added a "QR Check-In" quick action, shown only for published actions
- `frontend/src/features/participation/components/MyActionCard.vue` — shows an attendance chip (and check-in time) for confirmed participations only
- `frontend/src/features/participation/views/MyActionsView.vue` — passes each entry's attendance record down to `MyActionCard`
- `frontend/src/features/auth/components/AccountMenu.vue` — added a "Check-in" item for volunteers
- `frontend/src/constants/routes.js` — `CHECK_IN` route + `organizerActionCheckInPath()` helper
- `frontend/src/router/routes/public.routes.js` — registered `attendanceRoutes`
- `frontend/src/locales/index.js` — registered the `attendance` namespace
- `frontend/src/locales/el/navigation.js`, `en/navigation.js` — added a `checkIn` label

## Files Removed

None.

## Folder Structure

```
frontend/src/features/attendance/
├── mocks/
│   ├── attendance.storage.js
│   └── qrSession.storage.js
├── services/
│   └── attendance.service.js
├── stores/
│   └── attendance.store.js
├── utils/
│   ├── attendanceStatus.js
│   ├── attendanceErrors.js
│   ├── checkInWindow.js
│   └── qrToken.js
├── views/
│   ├── OrganizerCheckInView.vue
│   └── CheckInView.vue
└── routes.js
```

Dependency direction: `attendance` reads from `organizer/mocks` (the merged action set, to check `organizerId`/`organizerStatus`), `participation/services` (`getParticipation`, `getParticipationById`), and no new reverse dependencies were introduced — `actions` and `organizer` still never import from `attendance`.

## Packages Installed

- `qrcode` (^1.5.4) — QR code generation (organizer's check-in screen)
- `vue-qrcode-reader` (^5.7.3) — QR camera scanning (volunteer's check-in screen)

No other dependencies added. No Axios.

## Build Result

PASS — `npm run build` (`vite build`) succeeded, 515 modules transformed, no errors. `dist/` removed afterward.

## Lint Result

PASS — `npm run lint` (`eslint . --ext .js,.vue`): 0 errors, 0 warnings.

## Test Result

No test script exists in `package.json` — none run, consistent with every prior feature in this session.

## Manual Verification

Performed live in Chrome against the running dev server, using `organizer@onehelp.local` / `Organizer123!` and `volunteer@onehelp.local` / `Volunteer123!`. No bugs were found — every flow below worked correctly on first try.

- **Organizer QR screen**: opened `/organizer/actions/act-001/check-in` for an own, published action — confirmed count (15) and checked-in count (0) matched, the "outside the usual window" notice showed correctly (all fixture dates are days out), and a live QR code rendered from the generated token.
- **Regenerate**: clicking regenerate produced a visually different QR code, reset the countdown, and showed a success notification.
- **Refresh persistence**: reloading the check-in screen kept the *same* session (countdown continued from where it was, not reset) — confirmed via the persisted `onehelp.attendance.qrSession` value.
- **Deep-link login round-trip**: navigating to `/check-in` while logged out redirected to `/login?redirect=/check-in`; logging in returned to `/check-in` directly.
- **Unregistered volunteer**: submitting a valid, unexpired token for an action the volunteer hadn't joined correctly showed "you haven't joined this action" without ever reaching the confirm step.
- **Registered volunteer check-in**: after joining the action, the same token flow showed the confirm screen (correct action title + date), and confirming completed the check-in with a success notification and success screen.
- **Duplicate check-in**: resubmitting the same token immediately showed "you've already checked in" (caught by a client-side pre-check before even calling the service).
- **Malformed token**: a `/check-in?token=not-a-real-token` deep link correctly showed "invalid code".
- **Expired token**: a hand-crafted, already-expired token (same encoding, valid structure) correctly showed "code expired".
- **My Actions integration**: the checked-in participation showed both the "Επιβεβαιωμένη συμμετοχή" and "Έγινε check-in" chips plus the check-in timestamp.
- **Organizer manual check-in/check-out**: from the participants list, checking out the same participant showed the check-out button disappear, a "checked out" chip, both timestamps, and a success notification; the organizer action details page's checked-in count updated accordingly.
- **Not-published gating**: opening the check-in screen for a draft action showed "check-in is only available for published actions" instead of attempting to generate a session.
- **Ownership**: opening another organizer's action's check-in screen (`/organizer/actions/act-002/check-in`) showed the same "not found or not yours" state used elsewhere in the organizer feature; a volunteer navigating directly to an organizer check-in URL was redirected to `/unauthorized` by the route guard.
- **Malformed storage recovery**: set both `onehelp.attendance` and `onehelp.attendance.qrSession` to invalid JSON — no crash anywhere; `onehelp.attendance` was confirmed repaired to `[]` immediately (My Actions read it), and `onehelp.attendance.qrSession` was confirmed repaired to a valid array as soon as the organizer's check-in screen next read it (repair only happens on read, same as every other mock store in this app — not proactive).
- **Locale switching**: switched to English on both the organizer QR screen and the account menu — fully translated, no raw keys spotted.
- **Console errors**: none observed at any point in this session (checked via `read_console_messages`).

**Camera scanning note:** the sandboxed Chrome instance unexpectedly has a working virtual camera, so `<QrcodeStream>` did render a live feed — but with no way to physically present a real QR code to it, the actual scan-to-detect path was exercised via the manual-entry tab instead (which shares the identical `handleToken()` validation/confirm/check-in logic). Camera-permission-denied and no-camera-available states could not be forced in this environment and are therefore code-reviewed but not click-tested.

## Remaining TODO

- Camera-permission-denied and no-camera-available states are implemented (via `<QrcodeStream>`'s `error` event, branching on `NotAllowedError`/`NotFoundError`) but not manually click-tested, per the sandbox limitation above.
- Physical narrow-viewport confirmation of the mobile bottom nav is still only source-verified (same sandbox resize-floor limitation noted in every prior feature report this session) — confirmed via code inspection that `AUTHENTICATED_MOBILE_NAVIGATION` was not touched by this feature and still holds exactly 4 items per role.
- No real concurrent-session protection (e.g. two organizers' browsers racing to regenerate the same action's QR session) — accepted limitation of the single-client mock architecture, consistent with every other mock feature in this app.

## Suggested Next Feature

Organizer action edit/create form validation polish and richer date/time pickers: now that both participation and attendance are fully wired end-to-end, the next natural improvement is refining the organizer's create/edit action form itself (e.g. friendlier date/time inputs, inline equipment-list editing) rather than new domain features — the core volunteer lifecycle (discover → join → check in) is now complete.

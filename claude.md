# OneHelp Frontend — Claude Code Instructions

## Project overview

OneHelp is a responsive web application that connects volunteers with verified social, environmental, health and emergency-support actions.

The current development phase is frontend-only.

Do not create:

* Backend applications
* Spring Boot code
* Database schemas
* Docker backend services
* Real API endpoints
* Server-side authentication

When data is required, use local mock data and mock service modules.

## Technology stack

Use:

* Vue 3
* JavaScript
* Vite
* Vuetify 3
* Pinia
* Vue Router
* Composition API
* `<script setup>`
* Axios
* Vitest
* ESLint
* Prettier
* Progressive Web App support

Do not use TypeScript.

Do not create:

* `.ts` files
* `.tsx` files
* TypeScript interfaces
* TypeScript types
* `tsconfig.json`
* `vue-tsc` configuration
* `<script setup lang="ts">`

Do not replace the selected stack without explicit approval.

## JavaScript standards

Use modern JavaScript with ES modules.

Always use:

* `const` by default
* `let` only when reassignment is required
* `async/await` for asynchronous operations
* optional chaining where useful
* nullish coalescing where appropriate
* destructuring where it improves readability
* named functions for important reusable logic
* clear JSDoc comments for complex reusable functions

Avoid:

* `var`
* deeply nested callbacks
* duplicated logic
* global mutable state
* unclear abbreviations
* overly large functions
* silent error handling

Use JSDoc when a service, composable or utility has a non-obvious contract.

Example:

```js
/**
 * Returns volunteering actions matching the provided filters.
 *
 * @param {Object} filters
 * @param {string|null} filters.category
 * @param {number|null} filters.distance
 * @returns {Promise<Array>}
 */
export async function getActions(filters) {
  return []
}
```

## Vue conventions

Always use Vue 3 Composition API with `<script setup>`.

Component structure:

```vue
<script setup>
</script>

<template>
</template>

<style scoped>
</style>
```

Do not use:

* Vue 2 syntax
* Options API unless explicitly requested
* Class-based components
* TypeScript syntax
* Business logic directly inside templates

Component filenames must use PascalCase.

Examples:

* `ActionCard.vue`
* `ActionFilters.vue`
* `VolunteerProfileForm.vue`
* `AppNavigation.vue`

Composable filenames must start with `use`.

Examples:

* `useAuth.js`
* `useActionFilters.js`
* `useQrScanner.js`
* `useNotifications.js`

Pinia store filenames should follow:

* `auth.store.js`
* `actions.store.js`
* `attendance.store.js`

Service filenames should follow:

* `auth.service.js`
* `actions.service.js`
* `attendance.service.js`

## Architecture

Use feature-oriented architecture.

Recommended structure:

```text
src/
├── assets/
│   ├── branding/
│   ├── icons/
│   └── images/
├── components/
│   ├── common/
│   ├── feedback/
│   ├── forms/
│   └── layout/
├── composables/
├── config/
├── features/
│   ├── actions/
│   │   ├── components/
│   │   ├── mocks/
│   │   ├── services/
│   │   ├── stores/
│   │   └── views/
│   ├── auth/
│   ├── attendance/
│   ├── organizations/
│   └── profile/
├── layouts/
├── mocks/
├── plugins/
├── router/
├── services/
├── stores/
├── styles/
├── utils/
├── views/
├── App.vue
└── main.js
```

Feature-specific components, services, stores and mock data must remain inside the appropriate feature directory.

Only genuinely reusable components should be placed in global folders.

## Domain terminology

Use `Action` as the source-code term for a volunteering activity.

Primary domain entities:

* User
* Volunteer
* Organization
* Action
* ActionCategory
* Participation
* CheckIn
* Location
* Notification

Do not use `Event` as the primary domain name because it can be confused with browser events.

## Components

Keep components small and focused.

A component should primarily handle:

* presentation
* user interaction
* local UI state
* emitting events

Move shared or complex logic into:

* composables
* Pinia stores
* service modules
* utility functions

Do not make API or mock service calls directly inside purely presentational components.

## State management

Use Pinia only for state shared across multiple screens or unrelated components.

Examples of appropriate Pinia state:

* current user
* authentication state
* selected organization
* global action filters
* notifications
* theme preferences

Keep local UI state inside components.

Examples:

* dialog visibility
* selected tab
* expansion panel state
* temporary form state
* local loading indicator

Do not place every value inside a Pinia store.

## Data layer

Do not connect to real APIs during this phase.

Use:

* local mock data
* asynchronous mock services
* centralized service abstractions
* realistic loading delays where useful
* consistent success and error responses

Mock services must be easy to replace with Axios services later.

Example structure:

```text
src/features/actions/
├── mocks/
│   └── actions.mock.js
├── services/
│   └── actions.service.js
└── stores/
    └── actions.store.js
```

Do not import mock data directly into views.

Views should request data through services or stores.

## Axios

Axios may be configured for future use, but do not call a real backend.

Keep the future base URL configurable:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Maintain an `.env.example` file.

Never commit:

* real API keys
* passwords
* tokens
* private URLs
* secrets

## Authentication

Authentication is mocked during the frontend-only phase.

Prepare the architecture for these roles:

* Visitor
* Volunteer
* Organizer
* Moderator
* Administrator

Mock authentication should be isolated inside:

* an authentication service
* an authentication store
* router guards

Do not implement mock authentication logic directly inside UI components.

Frontend route guards are for user experience only and must not be described as real security.

## Routing

Use separate route groups where appropriate:

* public routes
* authentication routes
* volunteer routes
* organizer routes
* administration routes

Use lazy-loaded route components.

Include:

* page titles
* route metadata
* authentication metadata
* role metadata where needed
* a not-found route

Do not place all routes inside one large unstructured file if the application grows.

## Responsive design

The application is mobile-first.

Support:

* Mobile: 320px and above
* Tablet: 768px and above
* Desktop: 1280px and above

Every screen must work correctly in a mobile browser.

Use:

* Vuetify responsive utilities
* Vuetify grid
* `useDisplay()`
* touch-friendly buttons
* responsive spacing
* mobile-specific navigation where appropriate

Avoid horizontal scrolling unless intentionally required.

Do not simply shrink desktop layouts for mobile.

## Accessibility

Target WCAG 2.2 AA.

Always include:

* semantic HTML
* keyboard-accessible interactions
* visible focus states
* accessible labels
* sufficient contrast
* descriptive button labels
* form validation messages
* meaningful image alternative text
* loading states
* empty states
* error states

Do not communicate meaning through color alone.

## Styling and branding

Use Vuetify 3 as the main UI framework.

Keep brand colors inside the central Vuetify theme configuration.

Initial brand direction:

* Deep blue for trust
* Teal for support and collaboration
* Green for environment and positive action
* White or light neutral surfaces
* Dark navy body text
* Rounded but professional components
* Clean and friendly interface

Avoid:

* excessive gradients
* excessive shadows
* unnecessary animations
* hard-coded colors in many components
* inconsistent spacing

## Internationalization preparation

The initial application language is Greek.

Do not duplicate the same user-facing strings across many components.

Keep important text centralized where practical so an internationalization library can be added later.

Do not add an i18n dependency until explicitly requested.

## Error handling

Every asynchronous feature must support:

* loading state
* success state
* empty state
* error state

Do not hide errors silently.

Use reusable feedback components for:

* loading
* empty data
* errors
* confirmations

## QR check-in

QR check-in is part of a later frontend milestone.

The planned frontend flow is:

1. The volunteer opens the scanner screen.
2. The volunteer scans a QR code.
3. The frontend extracts a temporary token.
4. A mock attendance service validates the token.
5. A success or error state is displayed.
6. Attendance history is updated through the mock service.

Do not encode sensitive personal information in QR mock data.

Do not use a plain numeric database ID as the planned production QR mechanism.

## Testing

Use Vitest for meaningful frontend logic.

Prioritize tests for:

* composables
* Pinia stores
* filtering
* validation
* utility functions
* asynchronous mock services
* state transitions

Do not write tests that only verify static text or implementation details.

Before completing a task, run when available:

```bash
npm run lint
npm run test:unit
npm run build
```

Report any command that fails or cannot be executed.

## Git rules

Use branches such as:

```text
feature/*
fix/*
docs/*
refactor/*
```

Use Conventional Commits:

```text
feat:
fix:
docs:
refactor:
test:
chore:
```

Do not:

* commit automatically
* push automatically
* merge branches automatically
* change Git configuration
* delete branches

Only perform Git write operations when explicitly requested.

## Task process

Before modifying files:

1. Inspect relevant project files.
2. Summarize the current implementation.
3. Propose a focused change.
4. List files that will be created or modified.
5. Identify possible risks.

During implementation:

1. Make small, coherent changes.
2. Avoid unrelated refactoring.
3. Preserve existing behavior.
4. Use modern JavaScript.
5. Add tests where useful.

After implementation, follow the "Feature completion reports" rule below.

## Feature completion reports

After every completed feature or phase, Claude must:

1. Return a concise report in the terminal response.
2. Save the same report as a Markdown file inside `docs/reports/` (create the folder if it does not exist).

Filename format:

```text
YYYY-MM-DD-feature-slug.md
```

Report sections, in this exact order and with no others added:

```markdown
# Phase Report — Feature Name

## Summary

## Files Created

## Files Modified

## Files Removed

## Folder Structure

## Packages Installed

## Build Result

## Lint Result

## Test Result

## Manual Verification

## Remaining TODO

## Suggested Next Feature
```

Rules:

* Do not include an Architecture Decisions section.
* Do not include full source files.
* Do not include full git diffs.
* Mention every file created, modified or removed.
* Record the exact validation commands run.
* Record failures honestly.
* Keep reports concise but sufficiently detailed.
* Do not overwrite earlier reports — each feature gets its own dated file.
* Reports must be committed only when the user later explicitly requests a Git commit.
* Creating the report file itself is part of completing each feature, not an optional extra step.

## Current objective

The immediate objective is to create the OneHelp frontend foundation:

* clean feature-oriented architecture
* Vuetify theme configuration
* global styles
* router structure
* public layout
* authentication layout
* application layout
* responsive navigation
* placeholder views
* reusable loading state
* reusable empty state
* reusable error state
* mock service architecture

Do not implement all OneHelp features in one task.

Work in small, reviewable phases.

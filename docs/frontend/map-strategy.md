# Frontend Map Strategy (MVP)

No map library is installed or implemented yet — this document records the planned approach for when maps are added in a later feature, so the Actions feature's location data (`latitude`/`longitude` on every mock action) is already shaped correctly for it.

## Library

**Leaflet** is the planned frontend map library.

- Free, open-source, no API key or billing account required.
- Lightweight and framework-agnostic; integrates cleanly with Vue 3 via a thin wrapper component (no need for a heavy Vue-specific map framework).
- No Google Maps dependency — avoids Google's API key/billing requirement and its usage-based pricing, which doesn't fit a free/open MVP.

## Map data

- **OpenStreetMap (OSM)** as the underlying map data source, rendered as raster/vector tiles.
- **GeoJSON** as the format for any richer location data (e.g. clusters of actions, service-area boundaries) — both Leaflet and OSM tooling support it natively, and it's a plain, dependency-free JSON structure that fits the rest of this codebase's plain-JS approach.

## Tile hosting — important constraint

Public OpenStreetMap tile servers (`tile.openstreetmap.org`) are suitable **only for low-volume development/MVP usage**, per OSM's own tile usage policy. They are **not unlimited production hosting** — heavy or commercial traffic can get an app's requests rate-limited or blocked.

To keep this replaceable without a rewrite later:

- The tile provider **must not be hardcoded** into the future map component. It should read a **tile URL template from configuration** (e.g. an env var such as `VITE_MAP_TILE_URL`, following the same pattern already used for `VITE_API_BASE_URL` in `frontend/.env.example`), with the public OSM tile server as the *default* for development only.
- This keeps the door open to swap in, later, without touching component code:
  - A paid/managed tile provider (e.g. MapTiler, Stadia Maps, Mapbox) — deliberately **not chosen or implemented now**, since this is meant to stay provider-neutral until a real production decision is made.
  - Self-hosted tiles (e.g. via `tileserver-gl` or a self-hosted OSM tile stack), for full control and no third-party usage limits.

## "Near me" / geolocation

The browser's native **Geolocation API** (`navigator.geolocation`) is the planned mechanism for a future "actions near me" feature — no third-party geolocation service needed. This requires explicit user permission and must degrade gracefully (map/list still usable without it) when denied or unavailable.

## What's already in place for this

- Every mock action in `src/features/actions/mocks/actions.mock.js` already carries `latitude`/`longitude` (real approximate coordinates for the Greek cities used in the fictional examples), so a future map component can consume this data without changing the Actions service/store contract.
- The Action Details screen reserves a location section (with a short "map coming in a later phase" note) rather than adding a placeholder map box — avoiding a blank/fake UI element that would need to be removed later.

## Explicitly out of scope for this note

- No paid-provider-specific implementation details (API keys, SDKs, pricing tiers) — that's a decision for when a map is actually built.
- No map library installation or rendering code.

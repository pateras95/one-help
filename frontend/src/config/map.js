/**
 * Central map configuration — components read tile/zoom/center values
 * from here instead of hardcoding them, so the tile provider (and
 * default view) can change in one place. See
 * `docs/frontend/map-strategy.md` for the full rationale.
 *
 * IMPORTANT: `tileUrl` defaults to the public OpenStreetMap tile
 * server. That is suitable for local development and a low-volume MVP
 * only — it is explicitly **not** unlimited production hosting (see
 * OSM's tile usage policy: heavy/commercial traffic can get rate-limited
 * or blocked). Set `VITE_MAP_TILE_URL` to a paid/managed provider (e.g.
 * MapTiler, Stadia Maps) or self-hosted tiles before any real production
 * traffic — no component code needs to change to do that.
 */
export const mapConfig = {
  tileUrl: import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  minZoom: 3,
  maxZoom: 18,
  defaultZoom: 12,
  // Athens — most mock actions cluster around Greek cities, so this is a
  // sensible default focus before any action/user location narrows it.
  defaultCenter: { lat: 37.9838, lng: 23.7275 },
  // Wider fallback used to frame the whole country when actions are
  // spread across many cities (e.g. no filters applied yet).
  greeceCenter: { lat: 39.0742, lng: 21.8243 },
  greeceZoom: 6,
  /**
   * Marker clustering is NOT implemented — the current mock dataset (13
   * actions) never needs it. This is reserved configuration for a
   * future feature: if the number of simultaneously visible markers
   * ever exceeds this, that's the signal to add clustering. No code
   * today reads this to actually cluster anything.
   */
  clusteringThreshold: 50
}

/**
 * Central branding configuration.
 *
 * Components must read brand values from here instead of hardcoding names,
 * colors or paths so the brand can be updated in one place.
 */
export const branding = {
  appName: 'OneHelp',
  // Placeholder path — no logo asset exists yet, update when real brand
  // assets are added.
  logoPath: '/branding/logo.svg',
  colors: {
    primary: '#1B3A6B',
    secondary: '#1B7F79',
    success: '#2E8B57',
    info: '#1B7F79',
    warning: '#B8860B',
    error: '#B3261E',
    background: '#F7F9FA',
    surface: '#FFFFFF',
    // Semantic roles layered on top of the base Material colors above —
    // referenced by name (e.g. `color="surfaceVariant"`, `text-textSecondary`)
    // instead of repeating hex values across components.
    // `surfaceVariant` is a genuine teal-leaning tint (not just a darker
    // neutral gray) so tinted sections read as deliberately "branded"
    // rather than another shade of the same grey as the page background.
    surfaceVariant: '#E3F0EE',
    textPrimary: '#152238',
    textSecondary: '#4B5A6B',
    border: '#D7E0E8'
  },
  // Mirrors the mobile-first breakpoints from the project guidelines.
  breakpoints: {
    mobile: 320,
    tablet: 768,
    desktop: 1280
  }
}

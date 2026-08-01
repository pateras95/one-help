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
    surface: '#FFFFFF'
  },
  // Mirrors the mobile-first breakpoints from the project guidelines.
  breakpoints: {
    mobile: 320,
    tablet: 768,
    desktop: 1280
  }
}

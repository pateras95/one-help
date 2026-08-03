/**
 * Central branding configuration — the "Signal" identity.
 *
 * Components must read brand values from here instead of hardcoding names,
 * colors or paths so the brand can be updated in one place.
 */
export const branding = {
  appName: 'OneHelp',
  logoPath: '/branding/logo.svg',
  colors: {
    // Deep ink navy — the trust/calm anchor. Headlines, primary buttons,
    // the wordmark's first half.
    primary: '#132A4D',
    // Signal coral — warm, energetic, and deliberately NOT reused by any
    // status color below, so it reads as a distinct brand accent rather
    // than colliding with "error"/"urgent" semantics.
    secondary: '#E85C3F',
    // Warm amber — the third brand hue, for "attention without alarm"
    // (featured tiles, in-progress states, highlights).
    accent: '#F0A93A',
    success: '#2E8B57',
    info: '#1F6F93',
    warning: '#C97A1D',
    // Reserved exclusively for emergency/urgent contexts — never reused
    // as a generic "warning" tone elsewhere, so it always means one thing.
    error: '#C8402E',
    background: '#FAF8F4',
    surface: '#FFFFFF',
    // A warm coral-tinted wash (not a cool grey/teal) so tinted sections
    // read as deliberately branded, not just "a darker shade of the page".
    surfaceVariant: '#FCF1EB',
    // A second, cooler tint used sparingly for operational (organizer/
    // admin) surfaces so those workspaces feel calm and orderly rather
    // than reusing the warm public-facing wash everywhere.
    surfaceOperational: '#EFF2F6',
    textPrimary: '#1B2333',
    textSecondary: '#5B6472',
    border: '#E4DCD2',
    // Per-category hues — deliberately distinct from each other and from
    // the semantic roles above, so a category chip and an unrelated
    // status/urgency chip never accidentally share a color.
    categoryHealth: '#B5486B',
    categoryEnvironment: '#2E8B57',
    categorySocial: '#132A4D',
    categoryAnimals: '#B8860B',
    categoryEmergency: '#C8402E'
  },
  // Mirrors the mobile-first breakpoints from the project guidelines.
  breakpoints: {
    mobile: 320,
    tablet: 768,
    desktop: 1280
  }
}

import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { branding } from '@/config/branding'

/**
 * OneHelp brand theme, sourced from the central branding config so colors
 * are never hardcoded per component.
 */
const oneHelpLightTheme = {
  dark: false,
  colors: {
    ...branding.colors,
    'on-background': branding.colors.textPrimary,
    'on-surface': branding.colors.textPrimary
  }
}

export const vuetify = createVuetify({
  theme: {
    defaultTheme: 'oneHelpLight',
    themes: {
      oneHelpLight: oneHelpLightTheme
    }
  },
  display: {
    // Aligns Vuetify's display breakpoints with the project's mobile /
    // tablet / desktop targets so `useDisplay().mobile` is true below the
    // tablet breakpoint, matching the mobile-first navigation behavior.
    mobileBreakpoint: 'sm',
    thresholds: {
      xs: 0,
      sm: branding.breakpoints.tablet,
      md: branding.breakpoints.desktop,
      lg: 1920,
      xl: 2560
    }
  },
  defaults: {
    VBtn: {
      rounded: 'lg'
    },
    VCard: {
      // Flat + a theme-aware border reads as "trustworthy and restrained"
      // instead of the heavier default elevation shadow.
      rounded: 'lg',
      variant: 'flat',
      border: true
    }
  }
})

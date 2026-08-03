import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { vuetify } from '@/plugins/vuetify'
import { i18n } from '@/plugins/i18n'
import { router } from '@/router'
import { useLocaleStore } from '@/stores/locale.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { repairOrganizationIntegrity } from '@/features/organizerApplication/utils/organizationIntegrity'
import '@/styles/main.css'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(vuetify)

useLocaleStore().init()
// Kicked off here so it starts as early as possible; the router guard
// awaits this same (cached) promise before resolving any guarded route,
// so there's no flicker even though we don't block mount on it here.
useAuthStore().initializeSession()

// Development-only mock-data integrity pass — never runs in production,
// never auto-assigns or auto-deletes anything, only repairs duplicate
// membership rows and warns about unresolvable organizer/organization
// pairings (see `organizationIntegrity.js`).
if (import.meta.env.DEV) {
  repairOrganizationIntegrity()
}

app.mount('#app')

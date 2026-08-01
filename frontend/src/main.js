import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { vuetify } from '@/plugins/vuetify'
import { i18n } from '@/plugins/i18n'
import { router } from '@/router'
import { useLocaleStore } from '@/stores/locale.store'
import '@/styles/main.css'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(vuetify)

useLocaleStore().init()

app.mount('#app')

import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // Explicitly pinned rather than left to Vite's own default so the port is
    // self-documenting here — the backend also runs on 8080 (server.port in
    // application.yml), so the two must never share a port.
    port: 5173
  }
})
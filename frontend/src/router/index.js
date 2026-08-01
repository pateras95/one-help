import { createRouter, createWebHistory } from 'vue-router'
import { publicRoutes } from './routes/public.routes'
import { applyDocumentTitle } from './documentTitle'

const routes = [
  ...publicRoutes
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
  applyDocumentTitle(to.meta.titleKey)
})

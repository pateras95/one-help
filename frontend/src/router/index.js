import { createRouter, createWebHistory } from 'vue-router'
import { publicRoutes } from './routes/public.routes'
import { applyDocumentTitle } from './documentTitle'
import { authGuard } from './authGuard'

const routes = [
  ...publicRoutes
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to) => {
  const guardResult = await authGuard(to)
  if (guardResult !== true) return guardResult

  applyDocumentTitle(to.meta.titleKey)
  return true
})

import { createRouter, createWebHistory } from 'vue-router'
import { publicRoutes } from './routes/public.routes'

const routes = [
  ...publicRoutes
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · OneHelp` : 'OneHelp'
})

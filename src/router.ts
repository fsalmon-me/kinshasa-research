import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'map',
      component: () => import('@/pages/MapPage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/pages/AdminPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/pages/AboutPage.vue'),
    },
  ],
})

// Auth guard — wait for Firebase Auth to initialise, then check
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  const { user, loading } = useAuth()

  // Wait for auth state to resolve (first load)
  if (loading.value) {
    await new Promise<void>((resolve) => {
      const stop = setInterval(() => {
        if (!loading.value) { clearInterval(stop); resolve() }
      }, 50)
    })
  }

  if (!user.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router

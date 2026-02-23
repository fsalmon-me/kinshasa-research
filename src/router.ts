import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'map',
      component: () => import('@/pages/MapPage.vue'),
      meta: { title: 'Carte — Kinshasa Research' },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { title: 'Connexion — Kinshasa Research' },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/pages/AdminPage.vue'),
      meta: { requiresAuth: true, title: 'Admin — Kinshasa Research' },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/pages/AboutPage.vue'),
      meta: { title: 'À propos — Kinshasa Research' },
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/pages/ReportsPage.vue'),
      meta: { title: 'Rapports — Kinshasa Research' },
    },
    {
      path: '/reports/:slug',
      name: 'report-view',
      component: () => import('@/pages/ReportsPage.vue'),
      meta: { title: 'Rapport — Kinshasa Research' },
    },
    {
      path: '/admin/reports',
      name: 'admin-reports',
      component: () => import('@/pages/ReportEditorPage.vue'),
      meta: { requiresAuth: true, title: 'Nouveau rapport — Kinshasa Research' },
    },
    {
      path: '/admin/reports/:slug',
      name: 'admin-report-edit',
      component: () => import('@/pages/ReportEditorPage.vue'),
      meta: { requiresAuth: true, title: 'Éditer rapport — Kinshasa Research' },
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

// Dynamic page titles
router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ?? 'Kinshasa Research'
})

export default router

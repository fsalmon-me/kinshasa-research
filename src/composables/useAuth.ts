import { ref, computed } from 'vue'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '@/firebase'

// ── Reactive state (singleton) ──────────────────────────

const user = ref<User | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Listen to auth state once at module load
let _initialized = false
function ensureListener() {
  if (_initialized) return
  _initialized = true
  onAuthStateChanged(auth, (u) => {
    user.value = u
    loading.value = false
  })
}

// ── Public API ──────────────────────────────────────────

export function useAuth() {
  ensureListener()

  const isAuthenticated = computed(() => !!user.value)
  const displayName = computed(() => user.value?.email ?? null)

  async function login(email: string, password: string) {
    error.value = null
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: any) {
      error.value = e.code === 'auth/invalid-credential'
        ? 'Email ou mot de passe incorrect'
        : e.message
      throw e
    }
  }

  async function logout() {
    await signOut(auth)
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    displayName,
    login,
    logout,
  }
}

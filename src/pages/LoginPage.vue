<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { login, error, isAuthenticated } = useAuth()

const email = ref('')
const password = ref('')
const submitting = ref(false)

async function handleLogin() {
  submitting.value = true
  try {
    await login(email.value, password.value)
    router.push({ name: 'admin' })
  } catch {
    // error is set in useAuth
  } finally {
    submitting.value = false
  }
}

// If already logged in, redirect
if (isAuthenticated.value) {
  router.replace({ name: 'admin' })
}
</script>

<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="handleLogin">
      <h1>🔐 Connexion Admin</h1>
      <p class="subtitle">Kinshasa Research — Accès réservé</p>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <label>
        <span>Email</span>
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          placeholder="admin@example.com"
        />
      </label>

      <label>
        <span>Mot de passe</span>
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          placeholder="••••••••"
        />
      </label>

      <button type="submit" :disabled="submitting" class="login-btn">
        {{ submitting ? 'Connexion…' : 'Se connecter' }}
      </button>

      <router-link to="/" class="back-link">← Retour à la carte</router-link>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a5276 0%, #2c7fb8 100%);
  font-family: system-ui, sans-serif;
}

.login-card {
  background: #fff;
  border-radius: 12px;
  padding: 40px 36px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.login-card h1 {
  font-size: 22px;
  margin: 0 0 4px;
  color: #333;
}

.subtitle {
  font-size: 13px;
  color: #888;
  margin: 0 0 24px;
}

.error-msg {
  background: #fce4ec;
  color: #c62828;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 16px;
}

label span {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 4px;
}

label input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

label input:focus {
  outline: none;
  border-color: #2c7fb8;
  box-shadow: 0 0 0 3px rgba(44, 127, 184, 0.15);
}

.login-btn {
  width: 100%;
  padding: 10px;
  background: #2c7fb8;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 16px;
}

.login-btn:hover:not(:disabled) {
  background: #256a9e;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.back-link {
  display: block;
  text-align: center;
  color: #2c7fb8;
  font-size: 13px;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}
</style>

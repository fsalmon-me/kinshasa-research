<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

function toggle() {
  const next = locale.value === 'fr' ? 'en' : 'fr'
  locale.value = next
  try {
    localStorage.setItem('kinshasa-locale', next)
  } catch { /* ignore */ }
}
</script>

<template>
  <button class="locale-switcher" @click="toggle" :title="locale === 'fr' ? 'Switch to English' : 'Passer en français'">
    {{ locale === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR' }}
  </button>
</template>

<style scoped>
.locale-switcher {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.locale-switcher:hover {
  background: #f0f0f0;
}
</style>

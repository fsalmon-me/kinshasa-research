<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import MapContainer from '@/components/MapContainer.vue'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'

const { t } = useI18n()
</script>

<template>
  <div class="map-page">
    <MapContainer />
    <LocaleSwitcher class="locale-switcher" />
    <router-link to="/reports" class="admin-link reports-link">📊 {{ t('common.reports') }}</router-link>
    <router-link to="/admin" class="admin-link">⚙️ {{ t('common.admin') }}</router-link>
  </div>
</template>

<style scoped>
.map-page {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.admin-link {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 1000;
  background: #fff;
  color: #333;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s;
}

.admin-link:hover {
  background: #f0f0f0;
}

.reports-link {
  right: 100px;
}

.locale-switcher {
  position: absolute;
  bottom: 12px;
  right: 180px;
  z-index: 1000;
}
</style>

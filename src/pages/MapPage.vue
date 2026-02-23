<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import MapContainer from '@/components/MapContainer.vue'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'

const { t } = useI18n()
</script>

<template>
  <div class="map-page">
    <MapContainer />
    <div class="bottom-bar">
      <LocaleSwitcher />
      <router-link to="/reports" class="bar-link">📊 {{ t('common.reports') }}</router-link>
      <router-link to="/admin" class="bar-link">⚙️ {{ t('common.admin') }}</router-link>
    </div>
  </div>
</template>

<style scoped>
.map-page {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.bottom-bar {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-link {
  background: #fff;
  color: #333;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.15s;
}

.bar-link:hover {
  background: #f0f0f0;
}
</style>

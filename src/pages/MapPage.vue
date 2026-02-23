<script setup lang="ts">
import MapContainer from '@/components/MapContainer.vue'
</script>

<template>
  <div class="map-page">
    <MapContainer />
    <router-link to="/reports" class="admin-link reports-link">📊 Rapports</router-link>
    <router-link to="/admin" class="admin-link">⚙️ Admin</router-link>
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
</style>

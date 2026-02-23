<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { activeProfile, availableProfiles } from '@/composables/useMatrixLayer'

const { t } = useI18n()

const emit = defineEmits<{
  change: [profileKey: string]
}>()

function select(key: string) {
  emit('change', key)
}

/** Traffic level colors */
const trafficColors: Record<string, string> = {
  'Fluide': '#4caf50',
  'Ralentissement': '#ff9800',
  'Activité': '#ffc107',
  'Hyper-congestion': '#f44336',
}

function trafficColor(traffic: string): string {
  return trafficColors[traffic] ?? '#999'
}
</script>

<template>
  <div v-if="availableProfiles.length > 0" class="congestion-bar">
    <div class="bar-label">{{ t('congestion.label') }}</div>
    <div class="profile-buttons">
      <button
        v-for="p in availableProfiles"
        :key="p.key"
        :class="['profile-btn', { active: p.key === activeProfile }]"
        @click="select(p.key)"
        :title="`${p.label}\n${p.hours}\nVitesse: ${p.speedRange}`"
      >
        <span class="traffic-dot" :style="{ background: trafficColor(p.traffic) }"></span>
        <span class="profile-label">{{ p.label.split('(')[0].trim() }}</span>
      </button>
    </div>
    <div class="profile-info">
      <span class="speed-badge">
        ⚡ {{ availableProfiles.find(p => p.key === activeProfile)?.speedRange ?? '' }}
      </span>
      <span class="traffic-badge" :style="{ color: trafficColor(availableProfiles.find(p => p.key === activeProfile)?.traffic ?? '') }">
        {{ availableProfiles.find(p => p.key === activeProfile)?.traffic ?? '' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.congestion-bar {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: system-ui, sans-serif;
  max-width: 95vw;
  flex-wrap: wrap;
}

.bar-label {
  font-size: 12px;
  color: #555;
  white-space: nowrap;
  font-weight: 600;
}

.profile-buttons {
  display: flex;
  gap: 3px;
}

.profile-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #ddd;
  background: #fafafa;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.profile-btn:hover {
  background: #f0f0f0;
  border-color: #bbb;
}

.profile-btn.active {
  background: #e3f2fd;
  border-color: #2c7fb8;
  color: #1565c0;
  font-weight: 600;
}

.traffic-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.profile-label {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-info {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
}

.speed-badge {
  color: #555;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.traffic-badge {
  font-weight: 600;
  font-size: 11px;
}

@media (max-width: 700px) {
  .congestion-bar {
    bottom: 6px;
    padding: 6px 10px;
    gap: 6px;
  }
  .profile-label {
    max-width: 60px;
  }
  .bar-label {
    display: none;
  }
}
</style>

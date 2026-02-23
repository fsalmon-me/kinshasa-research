<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LayerConfig } from '@/types/layer'

const props = defineProps<{
  layers: LayerConfig[]
}>()

const emit = defineEmits<{
  toggle: [layerId: string]
  showInfo: [layerId: string]
}>()

const collapsed = ref(false)

// Category labels — now using i18n would require useI18n() but these are computed
// We keep them reactive via computed in the groups below
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const categoryOrder = ['statistics', 'infrastructure', 'poi', 'transport', 'other']

interface CategoryGroup {
  key: string
  label: string
  layers: LayerConfig[]
}

const groups = computed<CategoryGroup[]>(() => {
  const map = new Map<string, LayerConfig[]>()
  for (const l of props.layers) {
    // Hide draft layers from the map panel
    if (l.status === 'draft') continue
    const cat = l.category ?? 'other'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(l)
  }
  const catLabels: Record<string, string> = {
    statistics: t('categories.statisticsIcon'),
    infrastructure: t('categories.infrastructureIcon'),
    poi: t('categories.poiIcon'),
    transport: t('categories.transportIcon'),
  }
  return categoryOrder
    .filter(k => map.has(k))
    .map(k => ({
      key: k,
      label: catLabels[k] ?? t('categories.otherIcon'),
      layers: map.get(k)!,
    }))
})

const infoLayer = ref<LayerConfig | null>(null)

function toggleInfo(layer: LayerConfig) {
  infoLayer.value = infoLayer.value?.id === layer.id ? null : layer
}
</script>

<template>
  <div class="layer-panel" :class="{ collapsed }">
    <div class="panel-header" @click="collapsed = !collapsed">
      <h3 class="panel-title">{{ t('layers.title') }}</h3>
      <span class="collapse-icon">{{ collapsed ? '▸' : '▾' }}</span>
    </div>

    <div v-show="!collapsed" class="panel-body">
      <div v-for="group in groups" :key="group.key" class="layer-group">
        <div class="group-label">{{ group.label }}</div>
        <div v-for="layer in group.layers" :key="layer.id" class="layer-row">
          <label class="layer-item" :class="{ active: layer.visible }">
            <input
              type="checkbox"
              :checked="layer.visible"
              @change="emit('toggle', layer.id)"
            />
            <span class="layer-name">{{ layer.name }}</span>
          </label>
          <button
            v-if="layer.metadata"
            class="info-btn"
            :class="{ active: infoLayer?.id === layer.id }"
            title="Voir la source"
            @click.stop="toggleInfo(layer)"
          >ℹ️</button>
        </div>
      </div>
    </div>

    <!-- Info popover -->
    <Transition name="fade">
      <div v-if="infoLayer?.metadata" class="info-popover">
        <div class="info-title">{{ infoLayer.name }}</div>
        <div class="info-desc">{{ infoLayer.description }}</div>
        <div v-if="infoLayer.metadata.source" class="info-field">
          <strong>{{ t('layers.source') }}</strong> {{ infoLayer.metadata.source }}
        </div>
        <div v-if="infoLayer.metadata.license" class="info-field">
          <strong>{{ t('layers.license') }}</strong> {{ infoLayer.metadata.license }}
        </div>
        <div v-if="infoLayer.metadata.accessDate" class="info-field">
          <strong>{{ t('layers.date') }}</strong> {{ infoLayer.metadata.accessDate }}
        </div>
        <div v-if="infoLayer.metadata.methodology" class="info-field info-method">
          {{ infoLayer.metadata.methodology }}
        </div>
        <a
          v-if="infoLayer.metadata.url"
          :href="infoLayer.metadata.url"
          target="_blank"
          rel="noopener"
          class="info-link"
        >{{ t('layers.viewSource') }}</a>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.layer-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1000;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  min-width: 220px;
  max-width: 280px;
  font-size: 13px;
  transition: all 0.2s;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
  user-select: none;
}

.panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.collapse-icon {
  color: #999;
  font-size: 12px;
}

.panel-body {
  padding: 6px 0;
  max-height: 60vh;
  overflow-y: auto;
}

.layer-group {
  padding: 0 10px;
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 6px 4px 2px;
  margin-top: 2px;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.layer-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}

.layer-item:hover {
  background: #f5f5f5;
}

.layer-item.active {
  font-weight: 500;
}

.layer-item input[type="checkbox"] {
  accent-color: #2c7fb8;
  margin: 0;
}

.layer-name {
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info-btn {
  border: none;
  background: none;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  opacity: 0.5;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.info-btn:hover, .info-btn.active {
  opacity: 1;
  background: #f0f0f0;
}

.info-popover {
  border-top: 1px solid #eee;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.5;
  background: #fafafa;
  border-radius: 0 0 8px 8px;
}

.info-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.info-desc {
  color: #666;
  margin-bottom: 6px;
}

.info-field {
  color: #555;
  margin-bottom: 2px;
}

.info-method {
  color: #777;
  font-size: 11px;
  margin-top: 4px;
}

.info-link {
  display: inline-block;
  margin-top: 4px;
  color: #2c7fb8;
  text-decoration: none;
  font-weight: 500;
}

.info-link:hover {
  text-decoration: underline;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

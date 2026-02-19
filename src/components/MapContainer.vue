<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import L from 'leaflet'
import {
  layers,
  selectedYear,
  loading,
  fetchLayerRegistry,
  toggleLayer,
  availableYears,
} from '@/composables/useDataStore'
import { useChoropleth } from '@/composables/useChoropleth'
import { useGeoJsonOverlay } from '@/composables/useGeoJsonOverlay'
import { useMarkerLayer } from '@/composables/useMarkerLayer'
import { useMatrixLayer } from '@/composables/useMatrixLayer'
import type { LayerConfig, ChoroplethLayer, GeoJsonLayer, MarkerLayer, MatrixLayer } from '@/types/layer'
import LayerPanel from './LayerPanel.vue'
import YearSlider from './YearSlider.vue'
import MapLegend from './MapLegend.vue'
import SourcesPanel from './SourcesPanel.vue'

// ---- Map setup ----
const mapEl = ref<HTMLElement | null>(null)
let map: L.Map | null = null

// ---- Layer instances (keyed by layer id) ----
const choroInstances = new Map<string, ReturnType<typeof useChoropleth>>()
const geojsonInstances = new Map<string, ReturnType<typeof useGeoJsonOverlay>>()
const markerInstances = new Map<string, ReturnType<typeof useMarkerLayer>>()
const matrixInstances = new Map<string, ReturnType<typeof useMatrixLayer>>()

// ---- Computed ----
const years = computed(() => availableYears())
const activeChoropleth = computed(() =>
  layers.value.find(l => l.type === 'choropleth' && l.visible) as ChoroplethLayer | undefined
)

// ---- Lifecycle ----
onMounted(async () => {
  if (!mapEl.value) return

  map = L.map(mapEl.value, {
    center: [-4.35, 15.35],
    zoom: 11,
    zoomControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map)

  loading.value = true
  try {
    await fetchLayerRegistry()
    // Show all initially visible layers
    for (const layer of layers.value) {
      if (layer.visible) await showLayer(layer)
    }
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  map?.remove()
  map = null
})

// ---- Layer management ----
async function showLayer(config: LayerConfig) {
  if (!map) return

  if (config.type === 'choropleth') {
    const inst = useChoropleth()
    choroInstances.set(config.id, inst)
    await inst.show(map, config as ChoroplethLayer)
  } else if (config.type === 'geojson') {
    const inst = useGeoJsonOverlay()
    geojsonInstances.set(config.id, inst)
    await inst.show(map, config as GeoJsonLayer)
  } else if (config.type === 'markers') {
    const inst = useMarkerLayer()
    markerInstances.set(config.id, inst)
    await inst.show(map, config as MarkerLayer)
  } else if (config.type === 'matrix') {
    const inst = useMatrixLayer()
    matrixInstances.set(config.id, inst)
    await inst.show(map, config as MatrixLayer)
  }
}

function hideLayer(config: LayerConfig) {
  if (!map) return

  if (config.type === 'choropleth') {
    choroInstances.get(config.id)?.remove(map)
    choroInstances.delete(config.id)
  } else if (config.type === 'geojson') {
    geojsonInstances.get(config.id)?.remove(map)
    geojsonInstances.delete(config.id)
  } else if (config.type === 'markers') {
    markerInstances.get(config.id)?.remove(map)
    markerInstances.delete(config.id)
  } else if (config.type === 'matrix') {
    matrixInstances.get(config.id)?.remove(map)
    matrixInstances.delete(config.id)
  }
}

async function onToggle(layerId: string) {
  const config = layers.value.find(l => l.id === layerId)
  if (!config) return
  toggleLayer(layerId)
  if (config.visible) {
    await showLayer(config)
  } else {
    hideLayer(config)
  }
}

function onYearChange(year: string) {
  selectedYear.value = year
}

// ---- Watch year changes → update all choropleth styles ----
watch(selectedYear, (year) => {
  for (const [id, inst] of choroInstances) {
    const config = layers.value.find(l => l.id === id)
    if (config?.type === 'choropleth') {
      inst.updateYear(config as ChoroplethLayer, year)
    }
  }
})
</script>

<template>
  <div class="map-root">
    <div ref="mapEl" class="map-container"></div>

    <!-- Loading overlay -->
    <Transition name="fade">
      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <span>Chargement…</span>
      </div>
    </Transition>

    <!-- Controls -->
    <LayerPanel :layers="layers" @toggle="onToggle" />

    <YearSlider
      v-if="years.length > 1"
      :years="years"
      :model-value="selectedYear"
      @update:model-value="onYearChange"
    />

    <MapLegend
      v-if="activeChoropleth"
      :config="activeChoropleth"
      :year="selectedYear"
      :layers="layers"
    />

    <SourcesPanel :layers="layers" />
  </div>
</template>

<style scoped>
.map-root {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-container {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  color: #333;
  backdrop-filter: blur(2px);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e0e0e0;
  border-top-color: #2c7fb8;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

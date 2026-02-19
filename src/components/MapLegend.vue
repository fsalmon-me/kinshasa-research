<script setup lang="ts">
import { computed } from 'vue'
import type { LayerConfig, ChoroplethLayer, GeoJsonLayer } from '@/types/layer'
import { formatThreshold } from '@/utils/helpers'

const props = defineProps<{
  config: ChoroplethLayer
  year: string
  layers: LayerConfig[]
}>()

// ---- Choropleth legend ----
const thresholds = computed(() => props.config.thresholds ?? [])
const colors = computed(() => props.config.colors ?? [])
// ---- GeoJSON legends (e.g. roads) ----
const geojsonLayers = computed(() =>
  props.layers.filter(l => l.type === 'geojson' && l.visible) as GeoJsonLayer[]
)
</script>

<template>
  <div class="map-legend">
    <!-- Choropleth legend -->
    <div class="legend-section">
      <h4>{{ config.name }} — {{ year }}</h4>
      <div class="legend-entries">
        <div v-for="(t, i) in thresholds" :key="i" class="legend-row">
          <span class="swatch" :style="{ background: colors[i + 1] }"></span>
          <span class="legend-text">{{ formatThreshold(t) }}+</span>
        </div>
        <div class="legend-row">
          <span class="swatch" :style="{ background: colors[0] }"></span>
          <span class="legend-text">&lt; {{ formatThreshold(thresholds[0]) }}</span>
        </div>
      </div>
    </div>

    <!-- GeoJSON legends -->
    <div v-for="gl in geojsonLayers" :key="gl.id" class="legend-section">
      <h4>{{ gl.name }}</h4>
      <div class="legend-entries">
        <div
          v-for="(style, key) in gl.styleMap"
          :key="key"
          class="legend-row"
        >
          <span
            class="swatch line-swatch"
            :style="{ background: style.color, height: (style.weight ?? 2) + 'px' }"
          ></span>
          <span class="legend-text">{{ style.label || key }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-legend {
  position: absolute;
  bottom: 80px;
  left: 12px;
  z-index: 1000;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  padding: 10px 14px;
  font-size: 12px;
  max-width: 200px;
}

.legend-section {
  margin-bottom: 8px;
}

.legend-section:last-child {
  margin-bottom: 0;
}

.legend-section h4 {
  margin: 0 0 6px 0;
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.legend-entries {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.swatch {
  display: inline-block;
  width: 18px;
  height: 14px;
  border-radius: 2px;
  flex-shrink: 0;
}

.line-swatch {
  border-radius: 1px;
  min-height: 2px;
}

.legend-text {
  color: #555;
}
</style>

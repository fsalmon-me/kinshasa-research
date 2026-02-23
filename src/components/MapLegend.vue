<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LayerConfig, ChoroplethLayer, GeoJsonLayer } from '@/types/layer'
import { formatThreshold } from '@/utils/helpers'

const props = defineProps<{
  config: ChoroplethLayer
  year: string
  layers: LayerConfig[]
}>()

// ---- Unit toggle ----
const useAlternateUnit = ref(false)

const hasAlternate = computed(() => !!props.config.unitAlternate)
const displayUnit = computed(() =>
  useAlternateUnit.value && props.config.unitAlternate
    ? props.config.unitAlternate.unit
    : props.config.unit
)
const unitFactor = computed(() =>
  useAlternateUnit.value && props.config.unitAlternate
    ? props.config.unitAlternate.factor
    : 1
)
const toggleLabel = computed(() =>
  useAlternateUnit.value
    ? props.config.unit
    : props.config.unitAlternate?.unit ?? ''
)

function formatDisplayThreshold(t: number): string {
  return formatThreshold(t * unitFactor.value)
}

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
      <h4>
        {{ config.name }} — {{ year }}
        <span class="legend-unit">({{ displayUnit }})</span>
      </h4>
      <button
        v-if="hasAlternate"
        class="unit-toggle"
        @click="useAlternateUnit = !useAlternateUnit"
        :title="`Basculer vers ${toggleLabel}`"
      >↔ {{ toggleLabel }}</button>
      <div class="legend-entries">
        <div v-for="(t, i) in thresholds" :key="i" class="legend-row">
          <span class="swatch" :style="{ background: colors[i + 1] }"></span>
          <span class="legend-text">{{ formatDisplayThreshold(t) }}+</span>
        </div>
        <div class="legend-row">
          <span class="swatch" :style="{ background: colors[0] }"></span>
          <span class="legend-text">&lt; {{ formatDisplayThreshold(thresholds[0]) }}</span>
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

.legend-unit {
  font-weight: 400;
  font-size: 10px;
  color: #888;
}

.unit-toggle {
  display: block;
  border: 1px solid #ddd;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 10px;
  cursor: pointer;
  margin-bottom: 6px;
  color: #2c7fb8;
  font-weight: 500;
}

.unit-toggle:hover {
  background: #e3f2fd;
  border-color: #2c7fb8;
}
</style>

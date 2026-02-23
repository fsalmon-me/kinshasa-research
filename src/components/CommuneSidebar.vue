<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChoroplethLayer, LayerConfig } from '@/types/layer'
import { layers, fetchGeoJSON, fetchData, selectedYear } from '@/composables/useDataStore'
import { normalize, formatNumber } from '@/utils/helpers'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'

const { t } = useI18n()

const props = defineProps<{
  communeName: string | null
  communeFeature: GeoJSON.Feature | null
  populationData: Map<string, Record<string, unknown>> | null
  visibleLayers?: LayerConfig[]
}>()

const emit = defineEmits<{
  close: []
}>()

// ---- POI counts ----
interface PoiCount {
  layerId: string
  name: string
  color: string
  count: number
}

const poiCounts = ref<PoiCount[]>([])
const loadingPoi = ref(false)

watch(() => props.communeFeature, async (feature) => {
  if (!feature) {
    poiCounts.value = []
    return
  }

  loadingPoi.value = true
  const counts: PoiCount[] = []

  for (const layer of layers.value) {
    if (layer.type !== 'markers') continue
    const file = (layer as any).geojsonFile ?? (layer as any).dataFile
    if (!file || !file.endsWith('.geojson')) continue

    try {
      const geojson = await fetchGeoJSON(file)
      let count = 0
      for (const f of geojson.features) {
        if (f.geometry.type !== 'Point') continue
        const coords = (f.geometry as GeoJSON.Point).coordinates
        const pt: GeoJSON.Feature<GeoJSON.Point> = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: {},
        }
        if (booleanPointInPolygon(pt, feature as any)) count++
      }
      counts.push({
        layerId: layer.id,
        name: layer.name,
        color: (layer as any).color ?? '#e74c3c',
        count,
      })
    } catch { /* skip layer on error */ }
  }

  poiCounts.value = counts
  loadingPoi.value = false
}, { immediate: true })

// ---- Population data ----
const populationYears = computed(() => {
  const choro = layers.value.find(l => l.type === 'choropleth') as ChoroplethLayer | undefined
  if (!choro || !props.communeName || !props.populationData) return []
  const record = props.populationData.get(normalize(props.communeName))
  if (!record) return []
  return Object.entries(choro.yearMap).map(([year, prop]) => ({
    year,
    value: Number(record[prop]) || 0,
    current: year === selectedYear.value,
  }))
})

const maxPop = computed(() => Math.max(...populationYears.value.map(y => y.value), 1))

const totalPoi = computed(() => poiCounts.value.reduce((sum, p) => sum + p.count, 0))

// ---- Visible choropleth layer data ----
interface ChoroplethInfo {
  layerId: string
  name: string
  unit: string
  value: number
  unitAlternate?: { unit: string; factor: number; label: string }
}

const choroInfos = ref<ChoroplethInfo[]>([])
const loadingChoro = ref(false)

watch([() => props.communeName, () => props.visibleLayers], async ([name, visLayers]) => {
  if (!name || !visLayers) {
    choroInfos.value = []
    return
  }

  loadingChoro.value = true
  const infos: ChoroplethInfo[] = []
  const normalizedName = normalize(name)

  for (const layer of visLayers) {
    if (layer.type !== 'choropleth' || !layer.visible) continue
    const choro = layer as ChoroplethLayer
    // Skip population — already shown separately
    if (choro.id === 'population') continue

    try {
      const data = await fetchData(choro.dataFile)
      const record = (data as Record<string, unknown>[]).find(
        (r) => normalize(String(r[choro.joinField] ?? '')) === normalizedName
      )
      if (!record) continue

      const year = selectedYear.value
      const prop = choro.yearMap[year] ?? Object.values(choro.yearMap)[0]
      const val = Number(record[prop]) || 0

      infos.push({
        layerId: choro.id,
        name: choro.name,
        unit: choro.unit,
        value: val,
        unitAlternate: choro.unitAlternate,
      })
    } catch { /* skip on error */ }
  }

  choroInfos.value = infos
  loadingChoro.value = false
}, { immediate: true, deep: true })
</script>

<template>
  <Transition name="slide">
    <div v-if="communeName" class="sidebar-panel">
      <div class="sidebar-header">
        <h2>{{ communeName }}</h2>
        <button class="close-btn" @click="emit('close')" title="Fermer">✕</button>
      </div>

      <!-- Population bar chart -->
      <section v-if="populationYears.length" class="section">
        <h3>{{ t('commune.population') }}</h3>
        <div class="bar-chart">
          <div
            v-for="item in populationYears"
            :key="item.year"
            class="bar-row"
            :class="{ current: item.current }"
          >
            <span class="bar-year">{{ item.year }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: (item.value / maxPop * 100) + '%' }"></div>
            </div>
            <span class="bar-value">{{ formatNumber(item.value) }}</span>
          </div>
        </div>
      </section>

      <!-- Visible choropleth layer data -->
      <section v-if="choroInfos.length" class="section">
        <h3>{{ t('commune.activeData') }}</h3>
        <div v-if="loadingChoro" class="loading-text">Chargement…</div>
        <div v-else class="choro-grid">
          <div v-for="info in choroInfos" :key="info.layerId" class="choro-item">
            <span class="choro-name">{{ info.name }}</span>
            <span class="choro-value">
              {{ formatNumber(Math.round(info.value * 100) / 100) }}
              <span class="choro-unit">{{ info.unit }}</span>
            </span>
            <span v-if="info.unitAlternate" class="choro-alt">
              ≈ {{ formatNumber(Math.round(info.value * info.unitAlternate.factor * 100) / 100) }}
              {{ info.unitAlternate.unit }}
            </span>
          </div>
        </div>
      </section>

      <!-- POI counts -->
      <section class="section">
        <h3>{{ t('commune.poi') }} <span class="poi-total">({{ totalPoi }})</span></h3>
        <div v-if="loadingPoi" class="loading-text">Comptage en cours…</div>
        <div v-else-if="poiCounts.length" class="poi-grid">
          <div v-for="poi in poiCounts" :key="poi.layerId" class="poi-item">
            <span class="poi-dot" :style="{ background: poi.color }"></span>
            <span class="poi-name">{{ poi.name }}</span>
            <span class="poi-count">{{ poi.count }}</span>
          </div>
        </div>
        <div v-else class="empty-text">Aucun POI chargé</div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.sidebar-panel {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1001;
  width: 300px;
  height: 100%;
  background: #fff;
  box-shadow: 2px 0 12px rgba(0,0,0,0.15);
  overflow-y: auto;
  font-family: system-ui, sans-serif;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #2c7fb8;
  color: #fff;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  border: none;
  background: rgba(255,255,255,0.2);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover { background: rgba(255,255,255,0.35); }

.section {
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
}

.section h3 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #333;
}

.poi-total {
  font-weight: 400;
  color: #888;
  font-size: 12px;
}

/* Bar chart */
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-row.current {
  font-weight: 600;
}

.bar-year {
  width: 38px;
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 16px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: #2c7fb8;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.bar-row.current .bar-fill {
  background: #1a5c8a;
}

.bar-value {
  font-size: 12px;
  color: #333;
  min-width: 65px;
  text-align: right;
}

/* POI grid */
.poi-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.poi-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.poi-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.poi-name {
  flex: 1;
  font-size: 13px;
  color: #444;
}

.poi-count {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.loading-text, .empty-text {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

/* Choropleth info grid */
.choro-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.choro-item {
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #2c7fb8;
}

.choro-name {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.choro-value {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.choro-unit {
  font-size: 11px;
  font-weight: 400;
  color: #888;
}

.choro-alt {
  font-size: 11px;
  color: #888;
  margin-top: 1px;
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

@media (max-width: 600px) {
  .sidebar-panel {
    width: 100%;
    height: 50%;
    top: auto;
    bottom: 0;
    left: 0;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.15);
  }

  .slide-enter-from,
  .slide-leave-to {
    transform: translateY(100%);
  }
}
</style>

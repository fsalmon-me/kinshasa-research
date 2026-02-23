<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { LayerConfig } from '@/types/layer'
import type { FeatureOverride } from '@/types/layer'
import {
  layers,
  fetchLayerRegistry,
  fetchData,
  fetchGeoJSON,
  metadataOverrides,
  fetchMetadataOverrides,
  setFeatureOverride,
  exportMetadataOverrides,
  importMetadataOverrides,
} from '@/composables/useDataStore'

// ---- State ----
const activeLayerId = ref<string | null>(null)
const searchQuery = ref('')
const statusMsg = ref('')
const errorMsg = ref('')

// ---- Feature rows ----
interface FeatureRow {
  key: string           // unique identifier (osm_type/osm_id or index)
  props: Record<string, unknown>
  override: FeatureOverride
}

const featureRows = ref<FeatureRow[]>([])
const sourceColumns = ref<string[]>([])   // columns from source data (read-only)
const customColumns = ref<string[]>(['notes', 'verified'])  // user-added columns (editable)

// ---- Matrix view ----
interface MatrixData {
  communes: string[]
  durations: number[][]
  distances: number[][]
}
const matrixData = ref<MatrixData | null>(null)
const matrixMode = ref<'duration' | 'distance'>('duration')
const isMatrixView = computed(() => activeLayer.value?.type === 'matrix' && matrixData.value !== null)

function matrixGrid(): number[][] {
  if (!matrixData.value) return []
  return matrixMode.value === 'duration'
    ? matrixData.value.durations
    : matrixData.value.distances
}

function matrixCellColor(val: number): string {
  if (matrixMode.value === 'duration') {
    // minutes: green→yellow→red
    if (val <= 0) return '#f5f5f5'
    if (val < 15) return '#c8e6c9'
    if (val < 30) return '#fff9c4'
    if (val < 45) return '#ffe0b2'
    if (val < 60) return '#ffccbc'
    if (val < 90) return '#ef9a9a'
    return '#e57373'
  } else {
    // km: green→yellow→red
    if (val <= 0) return '#f5f5f5'
    if (val < 5) return '#c8e6c9'
    if (val < 10) return '#fff9c4'
    if (val < 20) return '#ffe0b2'
    if (val < 30) return '#ffccbc'
    if (val < 50) return '#ef9a9a'
    return '#e57373'
  }
}

function formatMatrixVal(val: number): string {
  if (matrixMode.value === 'duration') {
    return val < 1 ? '—' : Math.round(val).toString()
  } else {
    return val < 0.1 ? '—' : val.toFixed(1)
  }
}

// ---- Computed ----
const categoryLabels: Record<string, string> = {
  statistics: '📊 Statistiques',
  infrastructure: '🛣️ Infrastructure',
  poi: '📍 Points d\'intérêt',
  transport: '🚗 Transport',
}
const categoryOrder = ['statistics', 'infrastructure', 'poi', 'transport', 'other']

interface GroupedLayers { key: string; label: string; items: LayerConfig[] }
const groups = computed<GroupedLayers[]>(() => {
  const map = new Map<string, LayerConfig[]>()
  for (const l of layers.value) {
    const cat = l.category ?? 'other'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(l)
  }
  return categoryOrder
    .filter(k => map.has(k))
    .map(k => ({ key: k, label: categoryLabels[k] ?? '📦 Autre', items: map.get(k)! }))
})

const activeLayer = computed(() => layers.value.find(l => l.id === activeLayerId.value))

const filteredRows = computed(() => {
  if (!searchQuery.value) return featureRows.value
  const q = searchQuery.value.toLowerCase()
  return featureRows.value.filter(r => {
    return Object.values(r.props).some(v =>
      v != null && String(v).toLowerCase().includes(q)
    ) || Object.values(r.override).some(v =>
      v != null && String(v).toLowerCase().includes(q)
    )
  })
})

const stats = computed(() => {
  const total = featureRows.value.length
  const named = featureRows.value.filter(r => {
    const name = r.props.name ?? r.props.Name ?? r.props.commune
    return name != null && name !== '' && name !== 'null'
  }).length
  const verified = featureRows.value.filter(r => r.override.verified).length
  return { total, named, verified }
})

// ---- Lifecycle ----
onMounted(async () => {
  await Promise.all([fetchLayerRegistry(), fetchMetadataOverrides()])

  // Auto-select first layer
  if (layers.value.length && !activeLayerId.value) {
    selectLayer(layers.value[0].id)
  }
})

// ---- Functions ----
function getFeatureKey(props: Record<string, unknown>, index: number): string {
  if (props.osm_type && props.osm_id) return `${props.osm_type}/${props.osm_id}`
  if (props.id) return String(props.id)
  return `idx:${index}`
}

async function selectLayer(layerId: string) {
  activeLayerId.value = layerId
  searchQuery.value = ''
  errorMsg.value = ''
  featureRows.value = []
  sourceColumns.value = []
  matrixData.value = null

  const config = layers.value.find(l => l.id === layerId)
  if (!config) return

  try {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    let rawRows: Record<string, unknown>[] = []

    // Load data based on layer type
    if (config.type === 'markers' || config.type === 'geojson') {
      const file = config.type === 'markers'
        ? ((config as any).geojsonFile ?? (config as any).dataFile)
        : (config as any).geojsonFile
      if (file?.endsWith('.geojson') || file?.endsWith('.json') && config.type === 'geojson') {
        const geojson = await fetchGeoJSON(file)
        rawRows = geojson.features.map((f: any) => ({
          ...f.properties,
          _geometry_type: f.geometry?.type,
        }))
      } else if (file) {
        rawRows = await fetchData(file) as Record<string, unknown>[]
      }
    } else if (config.type === 'choropleth') {
      const data = await fetchData((config as any).dataFile)
      rawRows = data as Record<string, unknown>[]
    } else if (config.type === 'matrix') {
      // Matrix layer — load full matrix for cross-table view
      const res = await fetch(`${base}/data/${(config as any).dataFile}`)
      const data = await res.json()
      matrixData.value = {
        communes: data.communes ?? [],
        durations: data.durations ?? [],
        distances: data.distances ?? [],
      }
      rawRows = (data.communes ?? []).map((name: string, i: number) => ({
        commune: name,
        index: i,
      }))
    }

    // Extract source columns (excl internal fields)
    const skipFields = new Set(['_geometry_type'])
    if (rawRows.length > 0) {
      sourceColumns.value = Object.keys(rawRows[0]).filter(k => !skipFields.has(k))
    }

    // Discover any custom columns from existing overrides
    const layerOverrides = metadataOverrides.value[layerId] ?? {}
    const discoveredCustom = new Set<string>(customColumns.value)
    for (const ovr of Object.values(layerOverrides)) {
      for (const k of Object.keys(ovr)) {
        if (!sourceColumns.value.includes(k)) discoveredCustom.add(k)
      }
    }
    customColumns.value = [...discoveredCustom]

    // Build feature rows
    featureRows.value = rawRows.map((props, i) => {
      const key = getFeatureKey(props, i)
      const override = layerOverrides[key] ?? {}
      return { key, props, override: { ...override } }
    })
  } catch (e: any) {
    errorMsg.value = `Erreur de chargement: ${e.message}`
  }
}

function updateOverride(row: FeatureRow, field: string, value: string) {
  if (field === 'verified') {
    row.override.verified = value === 'true' || value === '1'
  } else {
    (row.override as any)[field] = value || undefined
  }
  setFeatureOverride(activeLayerId.value!, row.key, row.override)
  statusMsg.value = 'Modification enregistrée en mémoire'
}

function toggleVerified(row: FeatureRow) {
  row.override.verified = !row.override.verified
  setFeatureOverride(activeLayerId.value!, row.key, row.override)
  statusMsg.value = 'Statut vérifié mis à jour'
}

function addCustomColumn() {
  const name = prompt('Nom du nouveau champ personnalisé :')
  if (!name || customColumns.value.includes(name) || sourceColumns.value.includes(name)) return
  customColumns.value.push(name)
}

function doExportOverrides() {
  exportMetadataOverrides()
  statusMsg.value = 'Fichier metadata-overrides.json exporté'
}

async function doImportOverrides(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  try {
    await importMetadataOverrides(input.files[0])
    statusMsg.value = 'Overrides importées avec succès'
    // Reload current layer to reflect changes
    if (activeLayerId.value) await selectLayer(activeLayerId.value)
  } catch (e: any) {
    errorMsg.value = `Erreur d'import: ${e.message}`
  }
  input.value = '' // reset file input
}

function exportEnrichedData() {
  if (!activeLayerId.value || !featureRows.value.length) return
  const enriched = featureRows.value.map(r => ({
    ...r.props,
    ...r.override,
  }))
  const blob = new Blob([JSON.stringify(enriched, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${activeLayerId.value}-enriched.json`
  a.click()
  URL.revokeObjectURL(url)
}


</script>

<template>
  <div class="admin-page">
    <header class="admin-header">
      <router-link to="/" class="back-link">← Carte</router-link>
      <h1>Administration des données</h1>
      <div class="header-actions">
        <button class="btn" @click="doExportOverrides" title="Exporter les annotations (JSON)">⬇ Exporter</button>
        <label class="btn" title="Importer des annotations depuis un fichier JSON">
          ⬆ Importer
          <input type="file" accept=".json" hidden @change="doImportOverrides" />
        </label>
      </div>
    </header>

    <div class="admin-body">
      <!-- Sidebar: layer list -->
      <aside class="sidebar">
        <div v-for="group in groups" :key="group.key" class="sidebar-group">
          <div class="group-label">{{ group.label }}</div>
          <button
            v-for="layer in group.items"
            :key="layer.id"
            :class="['ds-btn', { active: layer.id === activeLayerId }]"
            @click="selectLayer(layer.id)"
          >
            {{ layer.name }}
          </button>
        </div>
      </aside>

      <!-- Main editor -->
      <main class="editor">
        <!-- Layer header -->
        <div v-if="activeLayer" class="layer-header">
          <div class="layer-info">
            <h2>{{ activeLayer.name }}</h2>
            <p class="layer-desc">{{ activeLayer.description }}</p>
            <div v-if="activeLayer.metadata" class="layer-meta">
              <span class="meta-badge">📦 {{ activeLayer.metadata.source }}</span>
              <span v-if="activeLayer.metadata.license" class="meta-badge">📜 {{ activeLayer.metadata.license }}</span>
              <span v-if="activeLayer.metadata.accessDate" class="meta-badge">📅 {{ activeLayer.metadata.accessDate }}</span>
            </div>
          </div>
          <div class="stat-cards">
            <div class="stat-card">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">Entrées</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ stats.named }}</div>
              <div class="stat-label">Nommés</div>
            </div>
            <div class="stat-card accent">
              <div class="stat-value">{{ stats.verified }}</div>
              <div class="stat-label">Vérifiés</div>
            </div>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher dans les données…"
              class="search-input"
            />
          </div>
          <button class="btn" @click="addCustomColumn">+ Champ</button>
          <button class="btn primary" @click="exportEnrichedData">⬇ Export enrichi</button>
        </div>

        <div v-if="errorMsg" class="msg error">{{ errorMsg }}</div>
        <div v-if="statusMsg" class="msg success" @click="statusMsg = ''">{{ statusMsg }} ✕</div>

        <!-- Matrix cross-table view -->
        <template v-if="isMatrixView && matrixData">
          <div class="matrix-toolbar">
            <button
              :class="['btn', { primary: matrixMode === 'duration' }]"
              @click="matrixMode = 'duration'"
            >⏱ Durées (min)</button>
            <button
              :class="['btn', { primary: matrixMode === 'distance' }]"
              @click="matrixMode = 'distance'"
            >📏 Distances (km)</button>
            <span class="matrix-legend">
              <span class="ml-swatch" style="background:#c8e6c9"></span> Court
              <span class="ml-swatch" style="background:#fff9c4"></span>
              <span class="ml-swatch" style="background:#ffe0b2"></span>
              <span class="ml-swatch" style="background:#ffccbc"></span>
              <span class="ml-swatch" style="background:#ef9a9a"></span>
              <span class="ml-swatch" style="background:#e57373"></span> Long
            </span>
          </div>
          <div class="matrix-wrapper">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th class="matrix-corner">De ↓ / Vers →</th>
                  <th
                    v-for="(name, ci) in matrixData.communes"
                    :key="'mh' + ci"
                    class="matrix-col-header"
                    :title="name"
                  >{{ name.slice(0, 6) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(rowData, ri) in matrixGrid()" :key="'mr' + ri">
                  <td class="matrix-row-header" :title="matrixData.communes[ri]">{{ matrixData.communes[ri] }}</td>
                  <td
                    v-for="(val, ci) in rowData"
                    :key="'mc' + ri + '-' + ci"
                    class="matrix-cell"
                    :style="{ backgroundColor: matrixCellColor(val) }"
                    :title="`${matrixData.communes[ri]} → ${matrixData.communes[ci]}: ${formatMatrixVal(val)} ${matrixMode === 'duration' ? 'min' : 'km'}`"
                  >{{ formatMatrixVal(val) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Data table -->
        <div v-else class="table-wrapper">
          <table v-if="filteredRows.length">
            <thead>
              <tr>
                <th class="col-num">#</th>
                <th
                  v-for="col in sourceColumns"
                  :key="col"
                  class="col-source"
                  :title="`Source: ${col}`"
                >{{ (activeLayer as any)?.fieldLabels?.[col] ?? col }}</th>
                <th
                  v-for="col in customColumns"
                  :key="'c_' + col"
                  class="col-custom"
                >{{ col === 'verified' ? '✓' : col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in filteredRows" :key="row.key" :class="{ verified: row.override.verified }">
                <td class="row-num">{{ ri + 1 }}</td>
                <!-- Source columns (read-only) -->
                <td v-for="col in sourceColumns" :key="col" class="cell-source">
                  <span :title="String(row.props[col] ?? '')">{{ row.props[col] ?? '' }}</span>
                </td>
                <!-- Custom/override columns (editable) -->
                <td v-for="col in customColumns" :key="'c_' + col" class="cell-custom">
                  <template v-if="col === 'verified'">
                    <button
                      :class="['verify-btn', { active: row.override.verified }]"
                      @click="toggleVerified(row)"
                      :title="row.override.verified ? 'Vérifié' : 'Non vérifié'"
                    >{{ row.override.verified ? '✅' : '⬜' }}</button>
                  </template>
                  <template v-else>
                    <input
                      :value="(row.override as any)[col] ?? ''"
                      @change="updateOverride(row, col, ($event.target as HTMLInputElement).value)"
                      :placeholder="col"
                    />
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="activeLayerId" class="empty">
            {{ searchQuery ? 'Aucun résultat pour cette recherche.' : 'Aucune donnée.' }}
          </p>
          <p v-else class="empty">Sélectionnez une couche dans le menu de gauche.</p>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  font-family: system-ui, sans-serif;
}

.admin-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #2c7fb8;
  color: #fff;
}

.admin-header h1 {
  font-size: 18px;
  margin: 0;
  font-weight: 600;
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.header-actions .btn {
  background: rgba(255,255,255,0.15);
  border-color: rgba(255,255,255,0.25);
  color: #fff;
  font-size: 12px;
  padding: 4px 10px;
}

.header-actions .btn:hover {
  background: rgba(255,255,255,0.25);
}

.back-link {
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.15);
}

.back-link:hover {
  background: rgba(255, 255, 255, 0.25);
}

.admin-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 200px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  padding: 8px;
  overflow-y: auto;
}

.sidebar-group {
  margin-bottom: 4px;
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 8px 8px 4px;
}

.ds-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ds-btn:hover { background: #f0f0f0; }
.ds-btn.active { background: #e3f2fd; color: #2c7fb8; font-weight: 600; }

/* Editor */
.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  overflow: hidden;
}

.layer-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.layer-info {
  flex: 1;
}

.layer-info h2 {
  margin: 0 0 4px;
  font-size: 18px;
  color: #333;
}

.layer-desc {
  margin: 0 0 6px;
  font-size: 13px;
  color: #666;
}

.layer-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-badge {
  font-size: 11px;
  background: #f0f0f0;
  border-radius: 10px;
  padding: 2px 8px;
  color: #555;
}

.stat-cards {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.stat-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 14px;
  text-align: center;
  min-width: 70px;
}

.stat-card.accent {
  border-color: #2c7fb8;
  background: #e3f2fd;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.stat-card.accent .stat-value {
  color: #2c7fb8;
}

.stat-label {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  align-items: center;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 8px;
}

.search-icon {
  font-size: 14px;
  margin-right: 6px;
}

.search-input {
  flex: 1;
  border: none;
  font-size: 13px;
  padding: 6px 0;
  outline: none;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.btn:hover { background: #f5f5f5; }
.btn.primary { background: #2c7fb8; color: #fff; border-color: #2c7fb8; }
.btn.primary:hover { background: #256a9e; }

.msg {
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 8px;
  cursor: pointer;
}

.msg.error { background: #fce4ec; color: #c62828; }
.msg.success { background: #e8f5e9; color: #2e7d32; }

/* Table */
.table-wrapper {
  flex: 1;
  overflow: auto;
}

table {
  border-collapse: collapse;
  width: max-content;
  min-width: 100%;
  font-size: 12px;
}

th, td {
  border: 1px solid #e0e0e0;
  padding: 4px 8px;
  text-align: left;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

th {
  background: #f5f5f5;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 2;
  font-size: 11px;
}

.col-num { width: 35px; text-align: center; }
.col-source { }
.col-custom {
  background: #fffde7;
  border-color: #fff9c4;
}

th.col-custom {
  background: #fff9c4;
  color: #f57f17;
}

.row-num {
  color: #999;
  text-align: center;
  font-size: 11px;
}

.cell-source {
  color: #555;
  background: #fafafa;
}

.cell-custom {
  background: #fffef5;
}

.cell-custom input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 12px;
  padding: 2px 0;
}

.cell-custom input:focus {
  outline: 2px solid #f57f17;
  border-radius: 2px;
}

tr.verified {
  background: #e8f5e9 !important;
}

tr.verified .cell-source {
  background: #e8f5e9;
}

.verify-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
}

.empty {
  color: #999;
  text-align: center;
  padding: 40px 0;
}

/* Matrix cross-table */
.matrix-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.matrix-legend {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #666;
  margin-left: 12px;
}

.ml-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid #ddd;
}

.matrix-wrapper {
  flex: 1;
  overflow: auto;
}

.matrix-table {
  border-collapse: collapse;
  font-size: 11px;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid #ddd;
  padding: 2px 4px;
  text-align: center;
  white-space: nowrap;
}

.matrix-corner {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 4;
  background: #e0e0e0;
  font-size: 10px;
  min-width: 100px;
  text-align: left;
  padding: 4px 6px;
}

.matrix-col-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f5f5f5;
  font-weight: 600;
  font-size: 10px;
  min-width: 45px;
  max-width: 55px;
  overflow: hidden;
  text-overflow: ellipsis;
  writing-mode: vertical-lr;
  transform: rotate(180deg);
  height: 65px;
  padding: 4px 2px;
}

.matrix-row-header {
  position: sticky;
  left: 0;
  z-index: 3;
  background: #f5f5f5;
  font-weight: 600;
  font-size: 10px;
  text-align: left;
  white-space: nowrap;
  padding: 2px 6px;
  min-width: 100px;
}

.matrix-cell {
  min-width: 40px;
  font-size: 10px;
  cursor: default;
  transition: outline 0.1s;
}

.matrix-cell:hover {
  outline: 2px solid #333;
  z-index: 1;
  position: relative;
}
</style>

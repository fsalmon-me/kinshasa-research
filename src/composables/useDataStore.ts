import { ref } from 'vue'
import type { LayerConfig } from '@/types/layer'
import type { FeatureOverride, MetadataOverrides } from '@/types/layer'
import type { DataRecord } from '@/types/data'

// =====================================
// Central data store (singleton)
// =====================================
// Caches fetched JSON and GeoJSON to avoid redundant network requests.
// Any composable or component can import and use this store.

/** Cached data files: filename → parsed JSON */
const dataCache = new Map<string, DataRecord[]>()

/** Cached geojson files: filename → parsed FeatureCollection */
const geojsonCache = new Map<string, GeoJSON.FeatureCollection>()

/** Layer registry loaded from layers.json */
export const layers = ref<LayerConfig[]>([])

/** Current year for temporal layers */
export const selectedYear = ref<string>('2017')

/** Loading state */
export const loading = ref(false)

/** Metadata overrides: layerId → featureKey → override fields */
export const metadataOverrides = ref<MetadataOverrides>({})

/** Search index for communes + POIs */
export interface SearchEntry {
  label: string
  type: 'commune' | 'poi'
  layerId: string
  lat: number
  lng: number
}

export const searchIndex = ref<SearchEntry[]>([])

/** Build search index from loaded GeoJSON data */
export async function buildSearchIndex() {
  const entries: SearchEntry[] = []

  // Communes from communes.geojson
  try {
    const communes = await fetchGeoJSON('communes.geojson')
    const centroid = (await import('@turf/centroid')).default
    for (const f of communes.features) {
      const name = f.properties?.name ?? f.properties?.NAME ?? ''
      if (!name) continue
      const center = centroid(f as any)
      entries.push({
        label: name,
        type: 'commune',
        layerId: 'communes',
        lat: center.geometry.coordinates[1],
        lng: center.geometry.coordinates[0],
      })
    }
  } catch { /* communes not available */ }

  // POIs from marker layers
  for (const layer of layers.value) {
    if (layer.type !== 'markers') continue
    const file = (layer as any).geojsonFile
    if (!file) continue
    try {
      const geojson = await fetchGeoJSON(file)
      for (const f of geojson.features) {
        const name = f.properties?.name ?? f.properties?.Name ?? ''
        if (!name || f.geometry.type !== 'Point') continue
        const coords = (f.geometry as GeoJSON.Point).coordinates
        entries.push({
          label: `${name} (${layer.name})`,
          type: 'poi',
          layerId: layer.id,
          lat: coords[1],
          lng: coords[0],
        })
      }
    } catch { /* skip */ }
  }

  searchIndex.value = entries
}

// =====================================
// Fetch helpers
// =====================================

const base = import.meta.env.BASE_URL.replace(/\/$/, '')

export async function fetchLayerRegistry(): Promise<LayerConfig[]> {
  const res = await fetch(`${base}/data/layers.json`)
  if (!res.ok) throw new Error(`Failed to load layers.json (${res.status})`)
  const data = await res.json()
  layers.value = data
  // Set default year from first choropleth
  const choro = data.find((l: LayerConfig) => l.type === 'choropleth')
  if (choro && 'defaultYear' in choro) {
    selectedYear.value = choro.defaultYear as string
  }
  return data
}

export async function fetchData(filename: string): Promise<DataRecord[]> {
  if (dataCache.has(filename)) return dataCache.get(filename)!
  const res = await fetch(`${base}/data/${filename}`)
  if (!res.ok) throw new Error(`Failed to load ${filename} (${res.status})`)
  const data = await res.json()
  dataCache.set(filename, data)
  return data
}

export async function fetchGeoJSON(filename: string): Promise<GeoJSON.FeatureCollection> {
  if (geojsonCache.has(filename)) return geojsonCache.get(filename)!
  const res = await fetch(`${base}/data/${filename}`)
  if (!res.ok) throw new Error(`Failed to load ${filename} (${res.status})`)
  const data = await res.json()
  geojsonCache.set(filename, data)
  return data
}

/** Toggle layer visibility */
export function toggleLayer(id: string) {
  const l = layers.value.find(l => l.id === id)
  if (l) l.visible = !l.visible
}

/** Get available years across all choropleth layers */
export function availableYears(): string[] {
  const years = new Set<string>()
  for (const l of layers.value) {
    if (l.type === 'choropleth' && 'yearMap' in l) {
      for (const y of Object.keys((l as any).yearMap)) {
        years.add(y)
      }
    }
  }
  return [...years].sort()
}

/** Clear all caches (useful for hot reload) */
export function clearCaches() {
  dataCache.clear()
  geojsonCache.clear()
}

// =====================================
// Metadata overrides management
// =====================================

/** Load overrides from a local JSON file (or initialize empty) */
export async function fetchMetadataOverrides(): Promise<MetadataOverrides> {
  try {
    const res = await fetch(`${base}/data/metadata-overrides.json`)
    if (res.ok) {
      const data = await res.json()
      metadataOverrides.value = data
      return data
    }
  } catch { /* file doesn't exist yet — fine */ }
  metadataOverrides.value = {}
  return {}
}

/** Get override for a specific feature */
export function getFeatureOverride(layerId: string, featureKey: string): FeatureOverride | undefined {
  return metadataOverrides.value[layerId]?.[featureKey]
}

/** Set override for a specific feature (updates reactive state) */
export function setFeatureOverride(layerId: string, featureKey: string, override: FeatureOverride) {
  if (!metadataOverrides.value[layerId]) {
    metadataOverrides.value[layerId] = {}
  }
  metadataOverrides.value[layerId][featureKey] = {
    ...metadataOverrides.value[layerId][featureKey],
    ...override,
  }
}

/** Export all overrides as a downloadable JSON file */
export function exportMetadataOverrides() {
  const blob = new Blob([JSON.stringify(metadataOverrides.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'metadata-overrides.json'
  a.click()
  URL.revokeObjectURL(url)
}

/** Import overrides from a JSON file */
export function importMetadataOverrides(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        metadataOverrides.value = data
        resolve()
      } catch (e) {
        reject(e)
      }
    }
    reader.readAsText(file)
  })
}

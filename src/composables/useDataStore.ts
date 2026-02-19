import { ref } from 'vue'
import type { LayerConfig } from '@/types/layer'
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

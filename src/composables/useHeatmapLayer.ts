import L from 'leaflet'
import 'leaflet.heat'
import type { HeatmapLayer } from '@/types/layer'
import type { DataRecord } from '@/types/data'
import { fetchData, fetchGeoJSON } from './useDataStore'
import { normalize } from '@/utils/helpers'
import centroid from '@turf/centroid'

/**
 * Manages a heatmap layer on the map.
 * Distributes heat points at commune centroids weighted by a data value.
 */
export function useHeatmapLayer() {
  let heatLayer: L.Layer | null = null

  async function show(map: L.Map, config: HeatmapLayer) {
    remove(map)

    const [geojson, data] = await Promise.all([
      fetchGeoJSON(config.geojsonFile),
      fetchData(config.dataFile),
    ])

    // Build lookup: normalized name → data record
    const lookup = new Map<string, DataRecord>()
    for (const row of data) {
      const key = normalize(String(row[config.joinField] ?? ''))
      lookup.set(key, row)
    }

    // Generate heat points from commune centroids weighted by value
    const points: [number, number, number][] = []

    for (const feature of geojson.features) {
      const name = normalize(feature.properties?.[config.geojsonJoinField] ?? '')
      const record = lookup.get(name)
      if (!record) continue

      const value = Number(record[config.valueField]) || 0
      if (value <= 0) continue

      const center = centroid(feature as any)
      const [lng, lat] = center.geometry.coordinates

      // Add intensity proportional to value
      // Normalize: use log scale for better distribution
      const intensity = Math.log10(value + 1)
      points.push([lat, lng, intensity])
    }

    if (points.length === 0) return

    heatLayer = L.heatLayer(points, {
      radius: config.radius ?? 30,
      blur: config.blur ?? 20,
      maxZoom: config.maxZoom ?? 14,
      max: Math.max(...points.map(p => p[2])),
      gradient: {
        0.2: '#ffffb2',
        0.4: '#fecc5c',
        0.6: '#fd8d3c',
        0.8: '#f03b20',
        1.0: '#bd0026',
      },
      pane: 'zones',
    }).addTo(map)
  }

  function remove(map: L.Map) {
    if (heatLayer) {
      map.removeLayer(heatLayer)
      heatLayer = null
    }
  }

  return { show, remove }
}

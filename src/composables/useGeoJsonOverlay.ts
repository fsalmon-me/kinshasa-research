import L from 'leaflet'
import type { GeoJsonLayer } from '@/types/layer'
import { fetchGeoJSON } from './useDataStore'

/**
 * Manages a raw GeoJSON overlay (lines, polygons, etc.)
 * styled by a property (e.g. road type).
 */
export function useGeoJsonOverlay() {
  let leafletLayer: L.GeoJSON | null = null

  async function show(map: L.Map, config: GeoJsonLayer) {
    remove(map)

    const geojson = await fetchGeoJSON(config.geojsonFile)

    leafletLayer = L.geoJSON(geojson, {
      pane: 'lines',
      style: (feature) => {
        if (!config.styleProperty || !config.styleMap) {
          return config.defaultStyle ?? { color: '#3388ff', weight: 2 }
        }
        const val = feature?.properties?.[config.styleProperty]
        const mapped = config.styleMap[val]
        if (mapped) {
          return { color: mapped.color, weight: mapped.weight, opacity: 0.8 }
        }
        return config.defaultStyle ?? { color: '#95a5a6', weight: 1.5, opacity: 0.6 }
      },
      onEachFeature: (feature, layer) => {
        if (config.popupFields?.length) {
          const props = feature.properties ?? {}
          const lines = config.popupFields
            .filter(f => props[f] != null && props[f] !== '')
            .map(f => `<strong>${config.fieldLabels?.[f] ?? f}:</strong> ${props[f]}`)
          if (lines.length) {
            layer.bindPopup(`<div class="popup-inner">${lines.join('<br>')}</div>`)
          }
        }
      },
    }).addTo(map)
  }

  function remove(map: L.Map) {
    if (leafletLayer) {
      map.removeLayer(leafletLayer)
      leafletLayer = null
    }
  }

  return { show, remove }
}

import L from 'leaflet'
import type { ChoroplethLayer } from '@/types/layer'
import type { DataRecord } from '@/types/data'
import { normalize, getColor, formatNumber } from '@/utils/helpers'
import { fetchData, fetchGeoJSON, selectedYear } from './useDataStore'

/**
 * Manages a single choropleth overlay on the map.
 * Handles: data loading, GeoJSON join, styling, popups, year switching.
 */
export function useChoropleth() {
  let leafletLayer: L.GeoJSON | null = null
  let joinedData: Map<string, DataRecord> | null = null

  type CommuneClickFn = (name: string, feature: GeoJSON.Feature, popData: Map<string, DataRecord> | null) => void

  /** Add / replace the choropleth on the map */
  async function show(map: L.Map, config: ChoroplethLayer, onCommuneClick?: CommuneClickFn) {
    remove(map)

    // Load both in parallel
    const [geojson, data] = await Promise.all([
      fetchGeoJSON(config.geojsonFile),
      fetchData(config.dataFile),
    ])

    // Build lookup: normalized commune name → data record
    joinedData = new Map<string, DataRecord>()
    for (const row of data) {
      const key = normalize(String(row[config.joinField] ?? ''))
      joinedData.set(key, row)
    }

    const year = selectedYear.value
    const prop = config.yearMap[year] ?? Object.values(config.yearMap)[0]

    leafletLayer = L.geoJSON(geojson, {
      pane: 'zones',
      style: (feature) => {
        const name = normalize(feature?.properties?.[config.geojsonJoinField] ?? '')
        const record = joinedData?.get(name)
        const value = record ? Number(record[prop]) || 0 : 0
        return {
          fillColor: getColor(value, config.thresholds, config.colors),
          weight: 2,
          opacity: 1,
          color: '#fff',
          fillOpacity: 0.75,
        }
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(() => buildPopup(feature, config), {
          maxWidth: 320,
          className: 'kinshasa-popup',
        })
        layer.on({
          click: () => {
            const geoName = feature.properties?.[config.geojsonJoinField] ?? ''
            if (onCommuneClick && geoName) {
              onCommuneClick(geoName, feature, joinedData)
            }
          },
          mouseover: (e) => {
            const t = e.target as L.Path
            t.setStyle({ weight: 4, color: '#333', fillOpacity: 0.9 })
            t.bringToFront()
          },
          mouseout: (e) => {
            leafletLayer?.resetStyle(e.target)
          },
        })
      },
    }).addTo(map)
  }

  /** Re-style without reloading data (for year change) */
  function updateYear(config: ChoroplethLayer, year: string) {
    if (!leafletLayer || !joinedData) return
    const prop = config.yearMap[year] ?? Object.values(config.yearMap)[0]

    leafletLayer.eachLayer((layer) => {
      const feature = (layer as any).feature
      if (!feature) return
      const name = normalize(feature.properties?.[config.geojsonJoinField] ?? '')
      const record = joinedData?.get(name)
      const value = record ? Number(record[prop]) || 0 : 0
      ;(layer as L.Path).setStyle({
        fillColor: getColor(value, config.thresholds, config.colors),
        weight: 2,
        opacity: 1,
        color: '#fff',
        fillOpacity: 0.75,
      })
    })
  }

  function buildPopup(feature: GeoJSON.Feature, config: ChoroplethLayer): string {
    const geoName = feature.properties?.[config.geojsonJoinField] ?? 'Inconnu'
    const record = joinedData?.get(normalize(geoName))

    let html = `<div class="popup-inner">`
    html += `<h3>${geoName}</h3>`

    if (record?.cluster) {
      html += `<div class="popup-cluster">${record.cluster}</div>`
    }

    html += `<table>`
    for (const [yearLabel, prop] of Object.entries(config.yearMap)) {
      const val = record ? Number(record[prop]) || 0 : 0
      const current = yearLabel === selectedYear.value
      html += `<tr class="${current ? 'current' : ''}">`
      html += `<td class="year">${yearLabel}</td>`
      html += `<td class="value">${formatNumber(val)}</td>`
      html += `<td class="unit">${config.unit}</td>`
      html += `</tr>`
    }
    html += `</table></div>`
    return html
  }

  function remove(map: L.Map) {
    if (leafletLayer) {
      map.removeLayer(leafletLayer)
      leafletLayer = null
      joinedData = null
    }
  }

  return { show, updateYear, remove }
}

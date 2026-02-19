import L from 'leaflet'
import type { MarkerLayer } from '@/types/layer'
import { fetchData, fetchGeoJSON } from './useDataStore'
import { formatNumber } from '@/utils/helpers'

/**
 * Manages a point marker layer on the map.
 * Supports both flat JSON (dataFile) and GeoJSON (geojsonFile) input.
 */
export function useMarkerLayer() {
  let layerGroup: L.LayerGroup | null = null

  async function show(map: L.Map, config: MarkerLayer) {
    remove(map)
    layerGroup = L.layerGroup()

    if (config.geojsonFile) {
      await showGeoJSON(config)
    } else if (config.dataFile) {
      await showFlatJSON(config)
    }

    layerGroup.addTo(map)
  }

  async function showGeoJSON(config: MarkerLayer) {
    const geojson = await fetchGeoJSON(config.geojsonFile!)
    const radius = config.radius ?? 6
    const color = config.color ?? '#e74c3c'

    for (const feature of geojson.features) {
      const geom = feature.geometry
      let lat: number, lng: number

      if (geom.type === 'Point') {
        lng = (geom as GeoJSON.Point).coordinates[0]
        lat = (geom as GeoJSON.Point).coordinates[1]
      } else {
        // For non-point geometries, skip or use centroid via bbox midpoint
        const coords = JSON.stringify((geom as any).coordinates)
        const lngs: number[] = []
        const lats: number[] = []
        coords.replace(/\[(-?\d+\.?\d*),(-?\d+\.?\d*)\]/g, (_: string, lo: string, la: string) => {
          lngs.push(+lo); lats.push(+la); return ''
        })
        if (!lngs.length) continue
        lng = lngs.reduce((a, b) => a + b) / lngs.length
        lat = lats.reduce((a, b) => a + b) / lats.length
      }

      if (isNaN(lat) || isNaN(lng)) continue

      const props = feature.properties ?? {}
      const label = String(props[config.labelField] ?? props.name ?? 'Sans nom')

      const marker = L.circleMarker([lat, lng], {
        radius,
        fillColor: color,
        color: '#fff',
        weight: 1.5,
        fillOpacity: 0.85,
      })

      const fields = config.popupFields ?? Object.keys(props)
      let html = `<div class="popup-inner"><h3>${label}</h3>`
      for (const f of fields) {
        if (f === config.labelField || props[f] == null || props[f] === '') continue
        const val = typeof props[f] === 'number' ? formatNumber(props[f] as number) : props[f]
        html += `<div><span class="field-label">${f}:</span> ${val}</div>`
      }
      html += '</div>'
      marker.bindPopup(html)
      marker.addTo(layerGroup!)
    }
  }

  async function showFlatJSON(config: MarkerLayer) {
    const data = await fetchData(config.dataFile!)
    const radius = config.radius ?? 6
    const color = config.color ?? '#e74c3c'

    for (const row of data) {
      const lat = Number(row[config.latField!])
      const lng = Number(row[config.lngField!])
      if (isNaN(lat) || isNaN(lng)) continue

      const label = String(row[config.labelField] ?? '')
      const marker = L.circleMarker([lat, lng], {
        radius,
        fillColor: color,
        color: '#fff',
        weight: 1.5,
        fillOpacity: 0.85,
      })

      const fields = config.popupFields ?? Object.keys(row).filter(
        k => k !== config.latField && k !== config.lngField
      )
      let html = `<div class="popup-inner"><h3>${label}</h3>`
      for (const f of fields) {
        if (f === config.labelField || row[f] == null || row[f] === '') continue
        const val = typeof row[f] === 'number' ? formatNumber(row[f] as number) : row[f]
        html += `<div><span class="field-label">${f}:</span> ${val}</div>`
      }
      html += '</div>'
      marker.bindPopup(html)
      marker.addTo(layerGroup!)
    }
  }

  function remove(map: L.Map) {
    if (layerGroup) {
      map.removeLayer(layerGroup)
      layerGroup = null
    }
  }

  return { show, remove }
}

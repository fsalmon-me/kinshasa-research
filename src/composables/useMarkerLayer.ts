import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import type { MarkerLayer } from '@/types/layer'
import { fetchData, fetchGeoJSON, getFeatureOverride } from './useDataStore'
import { formatNumber } from '@/utils/helpers'

const CLUSTER_THRESHOLD = 50  // Use clustering when > 50 features

/**
 * Manages a point marker layer on the map.
 * Uses markerClusterGroup when feature count exceeds threshold.
 * Supports both flat JSON (dataFile) and GeoJSON (geojsonFile) input.
 */
export function useMarkerLayer() {
  let layerGroup: L.LayerGroup | null = null

  function createDivIcon(color: string, radius: number): L.DivIcon {
    const size = radius * 2
    return L.divIcon({
      className: 'custom-marker',
      html: `<span style="
        display:block;width:${size}px;height:${size}px;
        border-radius:50%;background:${color};
        border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);
      "></span>`,
      iconSize: [size, size],
      iconAnchor: [radius, radius],
      popupAnchor: [0, -radius],
    })
  }

  async function show(map: L.Map, config: MarkerLayer) {
    remove(map)

    let features: { lat: number; lng: number; html: string }[] = []

    if (config.geojsonFile) {
      features = await buildGeoJSONFeatures(config)
    } else if (config.dataFile) {
      features = await buildFlatJSONFeatures(config)
    }

    const useClustering = features.length > CLUSTER_THRESHOLD
    const color = config.color ?? '#e74c3c'
    const radius = config.radius ?? 6
    const icon = createDivIcon(color, radius)

    if (useClustering) {
      layerGroup = (L as any).markerClusterGroup({
        maxClusterRadius: 40,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        chunkedLoading: true,
        clusterPane: 'markers',
      })
    } else {
      layerGroup = L.layerGroup()
    }

    for (const f of features) {
      const marker = L.marker([f.lat, f.lng], { icon, pane: 'markers' })
      marker.bindPopup(f.html)
      marker.addTo(layerGroup!)
    }

    layerGroup!.addTo(map)
  }

  async function buildGeoJSONFeatures(config: MarkerLayer) {
    const geojson = await fetchGeoJSON(config.geojsonFile!)
    const results: { lat: number; lng: number; html: string }[] = []

    for (const feature of geojson.features) {
      const geom = feature.geometry
      let lat: number, lng: number

      if (geom.type === 'Point') {
        lng = (geom as GeoJSON.Point).coordinates[0]
        lat = (geom as GeoJSON.Point).coordinates[1]
      } else {
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

      const fields = config.popupFields ?? Object.keys(props)
      const labels = config.fieldLabels ?? {}
      let html = `<div class="popup-inner"><h3>${label}</h3>`
      for (const f of fields) {
        if (f === config.labelField || props[f] == null || props[f] === '') continue
        const val = typeof props[f] === 'number' ? formatNumber(props[f] as number) : props[f]
        const displayLabel = labels[f] ?? f
        html += `<div><span class="field-label">${displayLabel}:</span> ${val}</div>`
      }
      if (props.osm_id && props.osm_type) {
        const osmUrl = `https://www.openstreetmap.org/${props.osm_type}/${props.osm_id}`
        html += `<div class="osm-link"><a href="${osmUrl}" target="_blank" rel="noopener">🔗 Voir sur OSM</a></div>`
      }
      const featureKey = props.osm_type && props.osm_id
        ? `${props.osm_type}/${props.osm_id}`
        : `idx:${geojson.features.indexOf(feature)}`
      const ovr = getFeatureOverride(config.id, featureKey)
      if (ovr?.verified) {
        html += `<div class="verified-badge">✅ Vérifié</div>`
      }
      if (ovr?.notes) {
        html += `<div class="override-notes">📝 ${ovr.notes}</div>`
      }
      html += '</div>'

      results.push({ lat, lng, html })
    }

    return results
  }

  async function buildFlatJSONFeatures(config: MarkerLayer) {
    const data = await fetchData(config.dataFile!)
    const results: { lat: number; lng: number; html: string }[] = []

    for (const row of data) {
      const lat = Number(row[config.latField!])
      const lng = Number(row[config.lngField!])
      if (isNaN(lat) || isNaN(lng)) continue

      const label = String(row[config.labelField] ?? '')
      const fields = config.popupFields ?? Object.keys(row).filter(
        k => k !== config.latField && k !== config.lngField
      )
      const labels = config.fieldLabels ?? {}
      let html = `<div class="popup-inner"><h3>${label}</h3>`
      for (const f of fields) {
        if (f === config.labelField || row[f] == null || row[f] === '') continue
        const val = typeof row[f] === 'number' ? formatNumber(row[f] as number) : row[f]
        const displayLabel = labels[f] ?? f
        html += `<div><span class="field-label">${displayLabel}:</span> ${val}</div>`
      }
      html += '</div>'

      results.push({ lat, lng, html })
    }

    return results
  }

  function remove(map: L.Map) {
    if (layerGroup) {
      map.removeLayer(layerGroup)
      layerGroup = null
    }
  }

  return { show, remove }
}

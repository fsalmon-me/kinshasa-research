import L from 'leaflet'
import type { MatrixLayer } from '@/types/layer'
import { fetchGeoJSON } from './useDataStore'
import { normalize, getColor } from '@/utils/helpers'

interface TravelData {
  communes: string[]
  durations: (number | null)[][]
  distances: (number | null)[][]
  metadata?: Record<string, unknown>
}

/**
 * Matrix layer: click a commune to see travel times to all other communes.
 * Colors each commune by travel duration from the selected origin.
 */
export function useMatrixLayer() {
  let geojsonLayer: L.GeoJSON | null = null
  let travelData: TravelData | null = null
  let selectedIndex: number | null = null

  async function show(map: L.Map, config: MatrixLayer) {
    remove(map)

    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    const [geojson, dataRes] = await Promise.all([
      fetchGeoJSON(config.geojsonFile),
      fetch(`${base}/data/${config.dataFile}`).then(r => r.json()),
    ])

    travelData = dataRes as TravelData

    // Build name → index lookup
    const nameIndex = new Map<string, number>()
    travelData.communes.forEach((name, i) => {
      nameIndex.set(normalize(name), i)
    })

    geojsonLayer = L.geoJSON(geojson, {
      style: () => ({
        fillColor: '#e0e0e0',
        weight: 2,
        opacity: 1,
        color: '#fff',
        fillOpacity: 0.5,
      }),
      onEachFeature: (feature, layer) => {
        const geoName = feature.properties?.[config.geojsonJoinField] ?? ''
        const idx = nameIndex.get(normalize(geoName))

        layer.on('click', () => {
          if (idx == null || !travelData) return
          selectedIndex = idx
          updateColors(config, nameIndex)
        })

        layer.on('mouseover', (e) => {
          const t = e.target as L.Path
          t.setStyle({ weight: 3, color: '#333' })
          t.bringToFront()

          if (selectedIndex != null && idx != null && travelData) {
            const dur = travelData.durations[selectedIndex][idx]
            const dist = travelData.distances[selectedIndex][idx]
            const origin = travelData.communes[selectedIndex]
            let tooltip = `<strong>${geoName}</strong><br>`
            tooltip += `Depuis ${origin}:<br>`
            tooltip += dur != null ? `🕐 ${dur} min` : '—'
            tooltip += dist != null ? ` · ${dist} km` : ''
            layer.bindTooltip(tooltip, { sticky: true }).openTooltip()
          }
        })

        layer.on('mouseout', (e) => {
          geojsonLayer?.resetStyle(e.target)
          if (selectedIndex != null) {
            updateColors(config, nameIndex)
          }
          layer.unbindTooltip()
        })
      },
    }).addTo(map)

    // Bind popup showing instructions
    showInstructions(map)
  }

  function showInstructions(map: L.Map) {
    // Show a brief instruction popup at center
    const popup = L.popup({ closeOnClick: true, autoClose: true })
      .setLatLng([-4.35, 15.35])
      .setContent('<div class="popup-inner"><strong>Mode temps de trajet</strong><br>Cliquez sur une commune pour voir les temps depuis celle-ci.</div>')
    popup.openOn(map)
    setTimeout(() => map.closePopup(popup), 4000)
  }

  function updateColors(config: MatrixLayer, nameIndex: Map<string, number>) {
    if (!geojsonLayer || !travelData || selectedIndex == null) return

    geojsonLayer.eachLayer((layer) => {
      const feature = (layer as any).feature
      if (!feature) return
      const geoName = feature.properties?.[config.geojsonJoinField] ?? ''
      const idx = nameIndex.get(normalize(geoName))
      if (idx == null) return

      const dur = travelData!.durations[selectedIndex!][idx]

      if (idx === selectedIndex) {
        ;(layer as L.Path).setStyle({
          fillColor: '#2ecc71',
          weight: 3,
          color: '#27ae60',
          fillOpacity: 0.9,
        })
      } else if (dur != null) {
        ;(layer as L.Path).setStyle({
          fillColor: getColor(dur, config.thresholds, config.colors),
          weight: 2,
          color: '#fff',
          fillOpacity: 0.75,
        })
      } else {
        ;(layer as L.Path).setStyle({
          fillColor: '#bdc3c7',
          weight: 1,
          color: '#fff',
          fillOpacity: 0.4,
        })
      }
    })

    // Update popups
    geojsonLayer.eachLayer((layer) => {
      const feature = (layer as any).feature
      if (!feature) return
      const geoName = feature.properties?.[config.geojsonJoinField] ?? ''
      const idx = nameIndex.get(normalize(geoName))
      if (idx == null) return

      const origin = travelData!.communes[selectedIndex!]
      const dur = travelData!.durations[selectedIndex!][idx]
      const dist = travelData!.distances[selectedIndex!][idx]

      let html = `<div class="popup-inner">`
      html += `<h3>${geoName}</h3>`
      if (idx === selectedIndex) {
        html += `<div style="color:#27ae60;font-weight:600">📍 Point de départ</div>`
      } else {
        html += `<div>Depuis <strong>${origin}</strong> :</div>`
        html += `<div>🕐 ${dur != null ? dur + ' min' : '—'}</div>`
        html += `<div>📏 ${dist != null ? dist + ' km' : '—'}</div>`
      }
      html += `</div>`

      layer.bindPopup(html, { className: 'kinshasa-popup' })
    })
  }

  function remove(map: L.Map) {
    if (geojsonLayer) {
      map.removeLayer(geojsonLayer)
      geojsonLayer = null
      travelData = null
      selectedIndex = null
    }
  }

  return { show, remove }
}

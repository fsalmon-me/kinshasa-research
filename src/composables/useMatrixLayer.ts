import { ref } from 'vue'
import L from 'leaflet'
import type { MatrixLayer } from '@/types/layer'
import { fetchGeoJSON, fetchData } from './useDataStore'
import { normalize, getColor } from '@/utils/helpers'

/** Single time-profile entry from travel-kinshasa.json */
interface ProfileEntry {
  label: string
  hours: string
  coeff: number
  speedRange: string
  traffic: string
  durations: (number | null)[][]
}

/** Full travel data with multi-profile support */
interface TravelData {
  communes: string[]
  distances: (number | null)[][]
  defaultProfile?: string
  // New multi-profile format
  profiles?: Record<string, ProfileEntry>
  // Legacy single-matrix format
  durations?: (number | null)[][]
  metadata?: Record<string, unknown>
}

/** Active profile key — shared with CongestionBar */
export const activeProfile = ref<string>('diurne')

/** Available profile keys — exposed for UI */
export const availableProfiles = ref<{ key: string; label: string; hours: string; speedRange: string; traffic: string }[]>([])

/**
 * Matrix layer: click a commune to see travel times to all other communes.
 * Colors each commune by travel duration from the selected origin.
 * Supports multi-profile data (5 time slots) with speed display.
 */
export function useMatrixLayer() {
  let geojsonLayer: L.GeoJSON | null = null
  let travelData: TravelData | null = null
  let selectedIndex: number | null = null
  let nameIndex = new Map<string, number>()
  let currentConfig: MatrixLayer | null = null

  /** Get durations matrix for the active profile */
  function getDurations(): (number | null)[][] {
    if (!travelData) return []
    if (travelData.profiles && travelData.profiles[activeProfile.value]) {
      return travelData.profiles[activeProfile.value].durations
    }
    // Fallback to legacy single-matrix format
    return travelData.durations ?? []
  }

  async function show(map: L.Map, config: MatrixLayer) {
    remove(map)

    const [geojson, dataRes] = await Promise.all([
      fetchGeoJSON(config.geojsonFile),
      fetchData(config.dataFile) as Promise<any>,
    ])

    travelData = dataRes as TravelData
    currentConfig = config

    // Set default profile
    if (travelData.defaultProfile) {
      activeProfile.value = travelData.defaultProfile
    }

    // Build profile list for UI
    if (travelData.profiles) {
      availableProfiles.value = Object.entries(travelData.profiles).map(([key, p]) => ({
        key,
        label: p.label,
        hours: p.hours,
        speedRange: p.speedRange,
        traffic: p.traffic,
      }))
    } else {
      availableProfiles.value = []
    }

    // Build name → index lookup
    nameIndex = new Map<string, number>()
    travelData.communes.forEach((name, i) => {
      nameIndex.set(normalize(name), i)
    })

    geojsonLayer = L.geoJSON(geojson, {
      pane: 'zones',
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
          updateColors(config)
        })

        layer.on('mouseover', (e) => {
          const t = e.target as L.Path
          t.setStyle({ weight: 3, color: '#333' })
          t.bringToFront()

          if (selectedIndex != null && idx != null && travelData) {
            const durations = getDurations()
            const dur = durations[selectedIndex]?.[idx]
            const dist = travelData.distances[selectedIndex]?.[idx]
            const origin = travelData.communes[selectedIndex]

            // Calculate average speed
            let speedStr = ''
            if (dur && dist && dur > 0) {
              const speed = dist / (dur / 60)
              speedStr = `⚡ ${speed.toFixed(0)} km/h`
            }

            let tooltip = `<strong>${geoName}</strong><br>`
            tooltip += `Depuis ${origin}:<br>`
            tooltip += dur != null ? `🕐 ${formatDuration(dur)}` : '—'
            tooltip += dist != null ? ` · 📏 ${dist} km` : ''
            if (speedStr) tooltip += `<br>${speedStr}`
            layer.bindTooltip(tooltip, { sticky: true }).openTooltip()
          }
        })

        layer.on('mouseout', (e) => {
          geojsonLayer?.resetStyle(e.target)
          if (selectedIndex != null) {
            updateColors(config)
          }
          layer.unbindTooltip()
        })
      },
    }).addTo(map)

    // Show a brief instruction popup at center
    showInstructions(map)
  }

  function showInstructions(map: L.Map) {
    const profileLabel = availableProfiles.value.find(p => p.key === activeProfile.value)?.label ?? activeProfile.value
    const popup = L.popup({ closeOnClick: true, autoClose: true })
      .setLatLng([-4.35, 15.35])
      .setContent(`<div class="popup-inner"><strong>Mode temps de trajet</strong><br>Profil: ${profileLabel}<br>Cliquez sur une commune pour voir les temps depuis celle-ci.</div>`)
    popup.openOn(map)
    setTimeout(() => map.closePopup(popup), 4000)
  }

  function updateColors(config: MatrixLayer) {
    if (!geojsonLayer || !travelData || selectedIndex == null) return

    const durations = getDurations()

    geojsonLayer.eachLayer((layer) => {
      const feature = (layer as any).feature
      if (!feature) return
      const geoName = feature.properties?.[config.geojsonJoinField] ?? ''
      const idx = nameIndex.get(normalize(geoName))
      if (idx == null) return

      const dur = durations[selectedIndex!]?.[idx]

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

    // Update popups with speed information
    geojsonLayer.eachLayer((layer) => {
      const feature = (layer as any).feature
      if (!feature) return
      const geoName = feature.properties?.[config.geojsonJoinField] ?? ''
      const idx = nameIndex.get(normalize(geoName))
      if (idx == null) return

      const origin = travelData!.communes[selectedIndex!]
      const dur = durations[selectedIndex!]?.[idx]
      const dist = travelData!.distances[selectedIndex!]?.[idx]

      let html = `<div class="popup-inner">`
      html += `<h3>${geoName}</h3>`
      if (idx === selectedIndex) {
        html += `<div style="color:#27ae60;font-weight:600">📍 Point de départ</div>`
      } else {
        html += `<div>Depuis <strong>${origin}</strong> :</div>`
        html += `<div>🕐 ${dur != null ? formatDuration(dur) : '—'}</div>`
        html += `<div>📏 ${dist != null ? dist + ' km' : '—'}</div>`
        // Average speed
        if (dur && dist && dur > 0) {
          const speed = dist / (dur / 60)
          html += `<div>⚡ Vitesse moy. : ${speed.toFixed(0)} km/h</div>`
        }
      }
      html += `</div>`

      layer.bindPopup(html, { className: 'kinshasa-popup' })
    })
  }

  /** Switch to a different time profile and re-color */
  function setProfile(profileKey: string) {
    activeProfile.value = profileKey
    if (currentConfig && selectedIndex != null) {
      updateColors(currentConfig)
    }
  }

  function remove(map: L.Map) {
    if (geojsonLayer) {
      map.removeLayer(geojsonLayer)
      geojsonLayer = null
      travelData = null
      selectedIndex = null
      nameIndex.clear()
      currentConfig = null
    }
  }

  return { show, remove, setProfile }
}

/** Format duration: show hours + minutes for large values */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}

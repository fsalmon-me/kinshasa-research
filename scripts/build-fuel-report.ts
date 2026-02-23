/**
 * build-fuel-report.ts
 *
 * Generates the "Offre & Demande de Carburant" report using ReportBuilder.
 * Reads fuel-demand.json and fuel.geojson to compute real statistics.
 *
 * Usage:  npx tsx scripts/build-fuel-report.ts
 * Output: public/data/reports.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ReportBuilder } from './lib/report-builder.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = join(__dirname, '..', 'public', 'data')

// ── Load data ──────────────────────────────────────────────────────
interface FuelRecord {
  commune: string
  pop_2025: number
  pop_2030: number
  pop_2040: number
  demand_2025: number
  demand_2030: number
  demand_2040: number
  saturated: boolean
  area_km2: number
  demand_per_capita_L_2025: number
  demand_per_km2_2025: number
  demand_per_capita_L_2030: number
  demand_per_km2_2030: number
  demand_per_capita_L_2040: number
  demand_per_km2_2040: number
}

const fuelData: FuelRecord[] = JSON.parse(readFileSync(join(DATA_DIR, 'fuel-demand.json'), 'utf-8'))
const fuelGeoJSON = JSON.parse(readFileSync(join(DATA_DIR, 'fuel.geojson'), 'utf-8'))
const communesGeoJSON = JSON.parse(readFileSync(join(DATA_DIR, 'communes.geojson'), 'utf-8'))

// ── Compute summary statistics ─────────────────────────────────────
const totalPop2025 = fuelData.reduce((s, r) => s + r.pop_2025, 0)
const totalDemand2025 = fuelData.reduce((s, r) => s + r.demand_2025, 0)
const totalDemand2030 = fuelData.reduce((s, r) => s + r.demand_2030, 0)
const totalDemand2040 = fuelData.reduce((s, r) => s + r.demand_2040, 0)
const totalStations = fuelGeoJSON.metadata?.featureCount ?? fuelGeoJSON.features.length
const saturatedCommunes = fuelData.filter(r => r.saturated).map(r => r.commune)

// Top 5 communes by demand
const top5Demand = [...fuelData].sort((a, b) => b.demand_2025 - a.demand_2025).slice(0, 5)
const top5DensityKm2 = [...fuelData].sort((a, b) => b.demand_per_km2_2025 - a.demand_per_km2_2025).slice(0, 5)

// Count stations per commune using a simple bounding approach
// (We don't have turf in this script context, so we'll count based on name matching from the GeoJSON)
// Actually let's use a simple Point-in-Polygon check with the commune polygons
// For simplicity, count stations that have a name-based commune tag or use centroid proximity

// Simple station count by iterating features
const stationsByCommune = new Map<string, number>()
for (const commune of fuelData) {
  stationsByCommune.set(commune.commune, 0)
}

// Point-in-polygon test (simple ray-casting for each station point against commune polygons)
function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function pointInMultiPolygon(point: [number, number], geometry: any): boolean {
  if (geometry.type === 'Polygon') {
    return pointInPolygon(point, geometry.coordinates[0])
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly: number[][][]) => pointInPolygon(point, poly[0]))
  }
  return false
}

for (const stationFeature of fuelGeoJSON.features) {
  if (stationFeature.geometry?.type !== 'Point') continue
  const coords: [number, number] = stationFeature.geometry.coordinates

  for (const communeFeature of communesGeoJSON.features) {
    const name = communeFeature.properties?.name
    if (!name) continue
    if (pointInMultiPolygon(coords, communeFeature.geometry)) {
      stationsByCommune.set(name, (stationsByCommune.get(name) ?? 0) + 1)
      break
    }
  }
}

const communesWithStations = [...stationsByCommune.entries()]
  .filter(([, count]) => count > 0)
  .sort((a, b) => b[1] - a[1])
const communesWithoutStations = [...stationsByCommune.entries()]
  .filter(([, count]) => count === 0)
  .map(([name]) => name)

// Format helpers
const fmt = (n: number) => n.toLocaleString('fr-FR')
const fmtK = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} M` : fmt(n)

console.log(`\n📊 Fuel Report Statistics:`)
console.log(`   Population 2025:  ${fmtK(totalPop2025)}`)
console.log(`   Demand 2025:      ${fmt(totalDemand2025)} m³/jour`)
console.log(`   Demand 2030:      ${fmt(totalDemand2030)} m³/jour`)
console.log(`   Demand 2040:      ${fmt(totalDemand2040)} m³/jour`)
console.log(`   Stations:         ${totalStations}`)
console.log(`   Saturated:        ${saturatedCommunes.join(', ')}`)
console.log(`   Top 5 demand:     ${top5Demand.map(r => `${r.commune} (${r.demand_2025})`).join(', ')}`)
console.log(`   Communes w/o stations: ${communesWithoutStations.join(', ')}`)
console.log(`   Stations distribution: ${communesWithStations.map(([n, c]) => `${n}:${c}`).join(', ')}`)

// ── Build the report ───────────────────────────────────────────────
const report = new ReportBuilder('Offre & Demande de Carburant — Kinshasa')
  .id('default-fuel-supply-demand')
  .slug('offre-demande-carburant')
  .description(`Analyse de l'offre (${totalStations} stations-service) et de la demande de carburant (${fmt(totalDemand2025)} m³/jour en 2025) pour les 24 communes de Kinshasa.`)

  // ── Introduction ──
  .h1('Offre & Demande de Carburant à Kinshasa')
  .text(
    `Ce rapport analyse la relation entre l'offre en stations-service et la demande de carburant estimée ` +
    `pour les 24 communes de Kinshasa. La métropole compte environ ${fmtK(totalPop2025)} habitants (projections 2025, ` +
    `ONU/Macrotrends) et consomme environ ${fmt(totalDemand2025)} m³ de carburant par jour, soit ${fmt(totalDemand2025 * 1000)} litres/jour. ` +
    `Cette consommation est projetée à ${fmt(totalDemand2030)} m³/jour en 2030 et ${fmt(totalDemand2040)} m³/jour en 2040 ` +
    `(scénario PDTK B), portée par la croissance démographique et la montée de la motorisation ` +
    `(actuellement ~4% des ménages, ×6,3 d'ici 2040 selon EDS-RDC III 2024).`
  )
  .text(
    `L'offre est évaluée via les ${totalStations} stations-service identifiées dans OpenStreetMap ` +
    `(Overpass API, février 2026). Cette source peut sous-estimer le nombre réel de points de vente ` +
    `informels de carburant.`
  )

  // ── Demande par commune ──
  .h2('Demande de carburant par commune')
  .text(
    `Le tableau ci-dessous présente la demande journalière en carburant par commune pour les horizons ` +
    `2025, 2030 et 2040. Les cinq communes les plus consommatrices en 2025 sont ` +
    `${top5Demand.map(r => `${r.commune} (${r.demand_2025} m³/j)`).join(', ')}.`
  )
  .table('fuel-demand.json', {
    title: 'Demande de carburant (m³/jour) — projections',
    columns: [
      { field: 'commune', label: 'Commune' },
      { field: 'pop_2025', label: 'Pop. 2025', format: 'number', decimals: 0 },
      { field: 'demand_2025', label: '2025 (m³/j)', format: 'number', decimals: 0 },
      { field: 'demand_2030', label: '2030 (m³/j)', format: 'number', decimals: 0 },
      { field: 'demand_2040', label: '2040 (m³/j)', format: 'number', decimals: 0 },
    ],
    sortBy: 'demand_2025',
    sortDir: 'desc',
  })
  .barChart('fuel-demand.json', {
    title: 'Demande de carburant par commune (m³/jour)',
    labelField: 'commune',
    datasets: [
      { field: 'demand_2025', label: '2025', color: '#1976d2' },
      { field: 'demand_2030', label: '2030', color: '#fb8c00' },
      { field: 'demand_2040', label: '2040', color: '#c62828' },
    ],
  })

  // ── Densité de demande ──
  .h2('Densité de demande')
  .text(
    `La densité de demande est exprimée de deux façons : par habitant (litres/personne/jour) et par ` +
    `superficie (m³/jour/km²). Les communes les plus denses spatialement sont ` +
    `${top5DensityKm2.map(r => `${r.commune} (${r.demand_per_km2_2025.toFixed(1)} m³/j/km²)`).join(', ')}. ` +
    `Ces indicateurs permettent de comparer l'intensité de la demande entre communes de tailles différentes.`
  )
  .table('fuel-demand.json', {
    title: 'Densité de demande — 2025',
    columns: [
      { field: 'commune', label: 'Commune' },
      { field: 'area_km2', label: 'Surface (km²)', format: 'number', decimals: 2 },
      { field: 'demand_per_capita_L_2025', label: 'L/pers/jour', format: 'number', decimals: 4 },
      { field: 'demand_per_km2_2025', label: 'm³/jour/km²', format: 'number', decimals: 2 },
    ],
    sortBy: 'demand_per_km2_2025',
    sortDir: 'desc',
  })
  .barChart('fuel-demand.json', {
    title: 'Demande par habitant (L/pers/jour) — 2025',
    labelField: 'commune',
    datasets: [
      { field: 'demand_per_capita_L_2025', label: 'L/personne/jour', color: '#7b1fa2' },
    ],
  })

  // ── Offre en stations-service ──
  .h2('Offre en stations-service')
  .text(
    `Kinshasa compte ${totalStations} stations-service référencées dans OpenStreetMap. ` +
    `La distribution est très inégale : ` +
    communesWithStations.slice(0, 5).map(([n, c]) => `${n} (${c})`).join(', ') +
    ` concentrent la majorité de l'offre, tandis que ` +
    (communesWithoutStations.length > 0
      ? `${communesWithoutStations.length} communes n'ont aucune station recensée (${communesWithoutStations.join(', ')}).`
      : `toutes les communes ont au moins une station.`)
  )
  .text(
    `⚠ Cette source (OSM) ne recense pas les points de vente informels de carburant ni les dépôts ` +
    `privés. La couverture réelle en approvisionnement peut être significativement différente.`
  )

  // ── Déséquilibre offre/demande ──
  .h2('Déséquilibre offre / demande')
  .text(
    `${saturatedCommunes.length} communes sont classées en saturation démographique résidente ` +
    `par le PDTK (densité >500 pers/ha) : ${saturatedCommunes.join(', ')}. ` +
    `Dans ces communes, la croissance de la consommation est portée par la motorisation et ` +
    `l'intensification des flux plutôt que par la croissance de la population résidente.`
  )
  .text(
    `Les communes périphériques (Nsele, Maluku, Mont-Ngafula) présentent les volumes absolus les ` +
    `plus élevés mais une faible densité spatiale de demande. L'offre en stations-service, ` +
    `concentrée dans les communes centrales, ne suit pas la croissance de la demande en périphérie — ` +
    `un facteur clé pour la planification d'infrastructure.`
  )
  .text(
    `La demande totale devrait passer de ${fmt(totalDemand2025)} à ${fmt(totalDemand2040)} m³/jour ` +
    `entre 2025 et 2040, soit une augmentation de ${Math.round((totalDemand2040 / totalDemand2025 - 1) * 100)}%. ` +
    `Sans expansion significative du réseau de distribution, plusieurs communes périphériques ` +
    `risquent des pénuries récurrentes d'approvisionnement.`
  )

  // ── Méthodologie ──
  .h2('Méthodologie')
  .text(
    `La demande journalière communale est modélisée par : Dⱼ = f(Population, Motorisation, Déficit électrique, Industrie). ` +
    `Population 2025 : 17,77 M (ONU/Macrotrends). Projections démographiques : PDTK Scénario B. ` +
    `Taux de motorisation : 4% des ménages (EDS-RDC III 2024), projeté ×6,3 d'ici 2040. ` +
    `Consommation métropolitaine de référence : 3 000 m³/jour (Min. Économie, avril 2025). ` +
    `Les valeurs communales sont normalisées pour que leur somme équivaille aux totaux métropolitains.`
  )
  .text(
    `L'offre en stations-service est extraite d'OpenStreetMap via Overpass API (tag amenity=fuel), ` +
    `géolocalisée et comptée par commune via intersection géométrique point-dans-polygone. ` +
    `Les communes sont définies par les polygones OSM du fichier communes.geojson.`
  )

  // ── Sources ──
  .dataSource('Données de demande (fuel-demand.json)', {
    description: 'Modélisation spatiale de la demande en hydrocarbures par commune 2025-2040',
    date: '2026-02-21',
  })
  .dataSource('Stations-service (fuel.geojson)', {
    description: `${totalStations} stations-service extraites d'OpenStreetMap`,
    url: 'https://www.openstreetmap.org/',
    date: '2026-02-19',
  })
  .dataSource('Polygones communes (communes.geojson)', {
    description: 'Limites administratives des 24 communes de Kinshasa, source OSM',
    url: 'https://www.openstreetmap.org/',
    date: '2026-02-18',
  })
  .source('JICA — Plan Directeur des Transports de Kinshasa (PDTK)', {
    description: 'Projections démographiques Scénario B, classification saturation démographique',
    date: '2019',
  })
  .source('Ministère de l\'Économie RDC — Consommation métropolitaine', {
    description: 'Données de consommation : 3 000 m³/jour pour la métropole de Kinshasa',
    date: 'Avril 2025',
  })
  .source('EDS-RDC III — Enquête Démographique et de Santé', {
    description: 'Taux de motorisation des ménages congolais : ~4%, projection ×6,3 d\'ici 2040',
    date: '2024',
  })
  .source('SNEL / AZES — Déficit électrique par commune', {
    description: 'Données de déficit électrique influençant la demande en groupes électrogènes',
  })
  .source('United Nations DESA — World Urbanization Prospects', {
    description: 'Population Kinshasa 2025 : 17,77 millions',
    url: 'https://population.un.org/wup/',
    date: '2024',
  })
  .source('Macrotrends — Kinshasa Population', {
    description: 'Projections démographiques complémentaires',
    url: 'https://www.macrotrends.net/cities/20839/kinshasa/population',
    date: '2025',
  })
  .source('OpenStreetMap — Overpass API', {
    description: 'Extraction des stations-service (amenity=fuel) dans la métropole de Kinshasa',
    url: 'https://overpass-turbo.eu/',
    date: '2026-02-19',
  })
  .sources('Sources & Références')
  .build()

// ── Write output ───────────────────────────────────────────────────
const outputPath = join(DATA_DIR, 'reports.json')
writeFileSync(outputPath, JSON.stringify([report], null, 2), 'utf-8')

console.log(`\n✅ Report written to ${outputPath}`)
console.log(`   Title: ${report.title}`)
console.log(`   Slug:  ${report.slug}`)
console.log(`   Blocks: ${report.blocks.length}`)

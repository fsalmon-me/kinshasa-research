/**
 * Compute commune areas (km²) from GeoJSON polygons and derive population density.
 * Usage: node scripts/compute-areas.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import area from '@turf/area'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'public', 'data')

// Load GeoJSON
const geojson = JSON.parse(readFileSync(join(dataDir, 'communes.geojson'), 'utf-8'))

// Compute area per commune (m² → km²)
const areaMap = new Map()
for (const feature of geojson.features) {
  const name = feature.properties.name
  if (!name) continue
  const areaM2 = area(feature)
  const areaKm2 = Math.round((areaM2 / 1e6) * 100) / 100
  areaMap.set(name, areaKm2)
  console.log(`  ${name}: ${areaKm2} km²`)
}

// Name mapping: GeoJSON name → population.json commune
const nameAliases = {
  "N'djili": "Ndjili",
  "Mont Ngafula": "Mont-Ngafula",
}
for (const [geoName, popName] of Object.entries(nameAliases)) {
  if (areaMap.has(geoName)) {
    areaMap.set(popName, areaMap.get(geoName))
    console.log(`  Alias: "${geoName}" → "${popName}" (${areaMap.get(popName)} km²)`)
  }
}

// Load population.json
const popPath = join(dataDir, 'population.json')
const population = JSON.parse(readFileSync(popPath, 'utf-8'))

// Enrich with area and density
let totalArea = 0
for (const entry of population) {
  const areaKm2 = areaMap.get(entry.commune)
  if (!areaKm2) {
    console.warn(`⚠ No area found for commune "${entry.commune}"`)
    entry.area_km2 = 0
    entry.density_2025 = 0
    entry.density_2030 = 0
    entry.density_2040 = 0
    continue
  }
  entry.area_km2 = areaKm2
  totalArea += areaKm2
  entry.density_2025 = Math.round(entry.pop_2025 / areaKm2)
  entry.density_2030 = Math.round(entry.pop_2030 / areaKm2)
  entry.density_2040 = Math.round(entry.pop_2040 / areaKm2)
  console.log(`  ${entry.commune}: ${areaKm2} km² → density_2025 = ${entry.density_2025} hab/km²`)
}

console.log(`\nTotal area: ${Math.round(totalArea)} km²`)
console.log(`Communes: ${population.length}`)

// Write back
writeFileSync(popPath, JSON.stringify(population, null, 2) + '\n')
console.log(`\n✅ population.json updated with area_km2 + density_2025/2030/2040`)

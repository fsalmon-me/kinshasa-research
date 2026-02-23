#!/usr/bin/env npx tsx
/**
 * overpass-discover.ts
 * 
 * Discovers new POI features in Kinshasa via Overpass API
 * that are missing from the existing GeoJSON files.
 * 
 * Usage:
 *   npx tsx scripts/overpass-discover.ts fuel
 *   npx tsx scripts/overpass-discover.ts hospitals
 *   npx tsx scripts/overpass-discover.ts fuel --add      # auto-add new features
 * 
 * Queries Overpass for all amenities of the given type within Kinshasa's
 * bounding box, compares against existing GeoJSON by osm_id, and reports
 * (or optionally adds) missing features.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const DATA_DIR = resolve(import.meta.dirname, '..', 'public', 'data')
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Kinshasa bounding box (approximate)
const BBOX = '-4.55,15.15,-4.1,15.65'

// POI type → { file, overpass query filter }
const POI_CONFIG: Record<string, { file: string; filter: string }> = {
  fuel:      { file: 'fuel.geojson',      filter: 'amenity=fuel' },
  hospitals: { file: 'hospitals.geojson',  filter: 'amenity~"hospital|clinic"' },
  schools:   { file: 'schools.geojson',    filter: 'amenity=school' },
  banks:     { file: 'banks.geojson',      filter: 'amenity=bank' },
  markets:   { file: 'markets.geojson',    filter: 'amenity=marketplace' },
  embassies: { file: 'embassies.geojson',  filter: 'office=diplomatic' },
}

// ---- CLI args ----
const args = process.argv.slice(2)
const doAdd = args.includes('--add')
const poiType = args.find(a => !a.startsWith('--'))

if (!poiType || !POI_CONFIG[poiType]) {
  console.error(`Usage: npx tsx scripts/overpass-discover.ts <${Object.keys(POI_CONFIG).join('|')}> [--add]`)
  process.exit(1)
}

const config = POI_CONFIG[poiType]
const filePath = resolve(DATA_DIR, config.file)

// ---- Load existing GeoJSON ----
let geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
const existingIds = new Set<string>()

if (existsSync(filePath)) {
  geojson = JSON.parse(readFileSync(filePath, 'utf-8'))
  for (const f of geojson.features) {
    const id = f.properties?.osm_id
    if (id) existingIds.add(String(id))
  }
  console.log(`📂 Loaded ${geojson.features.length} existing features (${existingIds.size} with osm_id)`)
} else {
  console.log(`📂 No existing file — will create ${config.file}`)
}

// ---- Query Overpass ----
console.log(`🔍 Querying Overpass for ${poiType} in Kinshasa...`)

const query = `
[out:json][timeout:60][bbox:${BBOX}];
(
  node[${config.filter}];
  way[${config.filter}];
  relation[${config.filter}];
);
out body center;
`.trim()

async function main() {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  if (!res.ok) {
    console.error(`❌ Overpass returned HTTP ${res.status}`)
    const text = await res.text()
    console.error(text.slice(0, 500))
    process.exit(1)
  }

  const data = await res.json() as {
    elements: Array<{
      type: string
      id: number
      lat?: number
      lon?: number
      center?: { lat: number; lon: number }
      tags?: Record<string, string>
    }>
  }

  console.log(`📡 Overpass returned ${data.elements.length} elements`)

  // Find new features not in existing GeoJSON
  const newFeatures: GeoJSON.Feature[] = []

  for (const el of data.elements) {
    if (existingIds.has(String(el.id))) continue

    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat == null || lon == null) continue

    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      properties: {
        osm_type: el.type,
        osm_id: el.id,
        ...(el.tags ?? {}),
      },
    }
    newFeatures.push(feature)
  }

  console.log(`\n📊 Results:`)
  console.log(`   Existing: ${existingIds.size}`)
  console.log(`   Found on Overpass: ${data.elements.length}`)
  console.log(`   New (missing): ${newFeatures.length}`)

  if (newFeatures.length === 0) {
    console.log(`\n✅ No new features to add — GeoJSON is up to date`)
    return
  }

  // Print new features
  console.log(`\n🆕 New features:`)
  for (const f of newFeatures.slice(0, 20)) {
    const p = f.properties!
    console.log(`   [${p.osm_type}/${p.osm_id}] ${p.name ?? '(sans nom)'} — ${p.amenity ?? p.office ?? '?'}`)
  }
  if (newFeatures.length > 20) {
    console.log(`   ... and ${newFeatures.length - 20} more`)
  }

  if (doAdd) {
    geojson.features.push(...newFeatures)
    writeFileSync(filePath, JSON.stringify(geojson, null, 2) + '\n', 'utf-8')
    console.log(`\n✅ Added ${newFeatures.length} new features to ${config.file}`)
    console.log(`   Total features: ${geojson.features.length}`)
  } else {
    console.log(`\n💡 Run with --add to add these features to ${config.file}`)
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})

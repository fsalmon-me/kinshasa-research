#!/usr/bin/env npx tsx
/**
 * overpass-enrich.ts
 * 
 * Enriches an existing POI GeoJSON file by fetching complete OSM tags
 * for each feature via the Overpass API.
 * 
 * Usage:
 *   npx tsx scripts/overpass-enrich.ts fuel
 *   npx tsx scripts/overpass-enrich.ts hospitals
 *   npx tsx scripts/overpass-enrich.ts schools
 *   npx tsx scripts/overpass-enrich.ts banks
 *   npx tsx scripts/overpass-enrich.ts markets
 *   npx tsx scripts/overpass-enrich.ts embassies
 * 
 * Features:
 *   - Fetches full OSM tags for each feature by osm_id
 *   - Rate-limited (1 request per second) to respect Overpass API limits
 *   - File-based cache to resume interrupted runs
 *   - Dry-run mode with --dry-run flag
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const DATA_DIR = resolve(import.meta.dirname, '..', 'public', 'data')
const CACHE_DIR = resolve(import.meta.dirname, '.cache')
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// POI type → GeoJSON filename mapping
const POI_FILES: Record<string, string> = {
  fuel: 'fuel.geojson',
  hospitals: 'hospitals.geojson',
  schools: 'schools.geojson',
  banks: 'banks.geojson',
  markets: 'markets.geojson',
  embassies: 'embassies.geojson',
}

// ---- CLI args ----
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const poiType = args.find(a => !a.startsWith('--'))

if (!poiType || !POI_FILES[poiType]) {
  console.error(`Usage: npx tsx scripts/overpass-enrich.ts <${Object.keys(POI_FILES).join('|')}> [--dry-run]`)
  process.exit(1)
}

const filename = POI_FILES[poiType]
const filePath = resolve(DATA_DIR, filename)

if (!existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`)
  process.exit(1)
}

// ---- Ensure cache dir ----
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })

const cacheFile = resolve(CACHE_DIR, `overpass-${poiType}.json`)
let cache: Record<string, Record<string, unknown>> = {}
if (existsSync(cacheFile)) {
  cache = JSON.parse(readFileSync(cacheFile, 'utf-8'))
  console.log(`📦 Loaded ${Object.keys(cache).length} cached entries`)
}

// ---- Load GeoJSON ----
const geojson: GeoJSON.FeatureCollection = JSON.parse(readFileSync(filePath, 'utf-8'))
console.log(`📂 Loaded ${geojson.features.length} features from ${filename}`)

// ---- Helpers ----
function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchOsmTags(osmType: string, osmId: string | number): Promise<Record<string, unknown> | null> {
  const cacheKey = `${osmType}/${osmId}`
  if (cache[cacheKey]) return cache[cacheKey]

  const typeMap: Record<string, string> = { node: 'node', way: 'way', relation: 'rel' }
  const overpassType = typeMap[osmType] ?? osmType

  const query = `[out:json][timeout:10];${overpassType}(${osmId});out tags;`

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    if (!res.ok) {
      console.warn(`  ⚠ HTTP ${res.status} for ${cacheKey}`)
      return null
    }

    const data = await res.json() as { elements?: Array<{ tags?: Record<string, unknown> }> }
    const tags = data.elements?.[0]?.tags ?? null

    if (tags) {
      cache[cacheKey] = tags
      // Save cache incrementally
      writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf-8')
    }

    return tags
  } catch (err) {
    console.warn(`  ⚠ Error fetching ${cacheKey}:`, (err as Error).message)
    return null
  }
}

// ---- Main enrichment loop ----
let enriched = 0
let skipped = 0
let errors = 0

for (let i = 0; i < geojson.features.length; i++) {
  const feature = geojson.features[i]
  const props = feature.properties ?? {}
  const osmType = props.osm_type as string | undefined
  const osmId = props.osm_id as string | number | undefined

  process.stdout.write(`\r  [${i + 1}/${geojson.features.length}] `)

  if (!osmType || !osmId) {
    skipped++
    continue
  }

  if (dryRun) {
    const cacheKey = `${osmType}/${osmId}`
    const inCache = !!cache[cacheKey]
    process.stdout.write(`${props.name ?? '?'} — ${inCache ? 'cached' : 'would fetch'}`)
    continue
  }

  const tags = await fetchOsmTags(osmType, osmId)
  if (tags) {
    // Merge tags into properties (existing props take precedence for geometry fields)
    feature.properties = { ...tags, ...props, osm_type: osmType, osm_id: osmId }
    enriched++
    process.stdout.write(`${props.name ?? '?'} ✓`)
  } else {
    errors++
    process.stdout.write(`${props.name ?? '?'} ✗`)
  }

  // Rate limit: 1 request per second
  const cacheKey = `${osmType}/${osmId}`
  if (!cache[cacheKey]) await sleep(1000)
}

console.log('\n')

if (!dryRun) {
  // Write enriched GeoJSON
  writeFileSync(filePath, JSON.stringify(geojson, null, 2) + '\n', 'utf-8')
  console.log(`✅ Enrichment complete:`)
  console.log(`   Enriched: ${enriched}`)
  console.log(`   Skipped (no osm_id): ${skipped}`)
  console.log(`   Errors: ${errors}`)
  console.log(`   Output: ${filePath}`)
} else {
  console.log(`🔍 Dry run complete — no files modified`)
  console.log(`   Would enrich: ${geojson.features.length - skipped} features`)
  console.log(`   Already cached: ${Object.keys(cache).length}`)
}

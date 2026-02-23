#!/usr/bin/env npx tsx
/**
 * enrich-fuel-demand.ts
 * 
 * Calculates per-capita and per-km² fuel demand density
 * by joining area_km2 from population.json into fuel-demand.json.
 * 
 * New fields per horizon (2025, 2030, 2040):
 *   - demand_per_capita_L_{year}  = (demand_{year} * 1000) / pop_{year}   [litres/person/day]
 *   - demand_per_km2_{year}       = demand_{year} / area_km2              [m³/day/km²]
 * 
 * Usage:  npx tsx scripts/enrich-fuel-demand.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const DATA_DIR = resolve(import.meta.dirname, '..', 'public', 'data')

interface FuelRow {
  commune: string
  pop_2025: number; pop_2030: number; pop_2040: number
  demand_2025: number; demand_2030: number; demand_2040: number
  saturated: boolean
  area_km2?: number
  demand_per_capita_L_2025?: number; demand_per_capita_L_2030?: number; demand_per_capita_L_2040?: number
  demand_per_km2_2025?: number; demand_per_km2_2030?: number; demand_per_km2_2040?: number
}

interface PopRow {
  commune: string
  area_km2: number
  [key: string]: unknown
}

// Read source data
const fuelData: FuelRow[] = JSON.parse(readFileSync(resolve(DATA_DIR, 'fuel-demand.json'), 'utf-8'))
const popData: PopRow[] = JSON.parse(readFileSync(resolve(DATA_DIR, 'population.json'), 'utf-8'))

// Build area lookup (normalize commune names for matching)
const normalize = (s: string) => s.toLowerCase().replace(/[-'\s]/g, '')
const areaMap = new Map<string, number>()
for (const p of popData) {
  areaMap.set(normalize(p.commune), p.area_km2)
}

// Enrich each commune
const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d
let enriched = 0

for (const row of fuelData) {
  const area = areaMap.get(normalize(row.commune))
  if (area == null) {
    console.warn(`⚠ No area_km2 found for commune "${row.commune}" — skipping`)
    continue
  }

  row.area_km2 = area

  for (const year of ['2025', '2030', '2040'] as const) {
    const pop = row[`pop_${year}`] as number
    const demand = row[`demand_${year}`] as number

    // Per capita: m³/day → litres/person/day  (×1000 / population)
    const perCapita = pop > 0 ? round((demand * 1000) / pop, 4) : 0;
    (row as any)[`demand_per_capita_L_${year}`] = perCapita

    // Per km²: m³/day/km²
    const perKm2 = area > 0 ? round(demand / area, 4) : 0;
    (row as any)[`demand_per_km2_${year}`] = perKm2
  }

  enriched++
}

// Write enriched data
const output = JSON.stringify(fuelData, null, 2)
writeFileSync(resolve(DATA_DIR, 'fuel-demand.json'), output + '\n', 'utf-8')

console.log(`✅ Enriched ${enriched}/${fuelData.length} communes with per-capita and per-km² fuel demand`)
console.log(`   Output: ${resolve(DATA_DIR, 'fuel-demand.json')}`)

// Print sample
const sample = fuelData[0]
console.log('\n📊 Sample (first commune):')
console.log(`   ${sample.commune}:`)
console.log(`     area_km2 = ${sample.area_km2}`)
console.log(`     demand_per_capita_L_2025 = ${(sample as any).demand_per_capita_L_2025} L/pers/jour`)
console.log(`     demand_per_km2_2025 = ${(sample as any).demand_per_km2_2025} m³/jour/km²`)

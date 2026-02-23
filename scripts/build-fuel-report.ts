/**
 * build-fuel-report.ts
 *
 * Generates the "Offre & Demande de Carburant" report using ReportBuilder.
 * Reads fuel-demand.json, fuel.geojson, communes.geojson, and travel-kinshasa.json.
 *
 * Supports multilingual generation (fr/en).
 *
 * Usage:
 *   npx tsx scripts/build-fuel-report.ts              # French only (default)
 *   npx tsx scripts/build-fuel-report.ts --lang en    # English only
 *   npx tsx scripts/build-fuel-report.ts --lang all   # Both languages
 *
 * Output: public/data/reports/{slug}.json + index.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ReportBuilder } from '../src/lib/report-builder.js'
import fr from '../src/i18n/fr.js'
import en from '../src/i18n/en.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = join(__dirname, '..', 'public', 'data')

// ── CLI args ───────────────────────────────────────────────────────
type Locale = 'fr' | 'en'
const langArg = process.argv.find((_, i, a) => a[i - 1] === '--lang') ?? 'fr'
const locales: Locale[] = langArg === 'all' ? ['fr', 'en'] : [langArg as Locale]

// ── Types ──────────────────────────────────────────────────────────
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

interface TravelData {
  communes: string[]
  distances: number[][]
  profiles: Record<string, {
    label: string
    hours: string
    coeff: number
    speedRange: string
    traffic: string
    durations: number[][]
  }>
}

// ── Load data ──────────────────────────────────────────────────────
const fuelData: FuelRecord[] = JSON.parse(readFileSync(join(DATA_DIR, 'fuel-demand.json'), 'utf-8'))
const fuelGeoJSON = JSON.parse(readFileSync(join(DATA_DIR, 'fuel.geojson'), 'utf-8'))
const communesGeoJSON = JSON.parse(readFileSync(join(DATA_DIR, 'communes.geojson'), 'utf-8'))
const travelData: TravelData = JSON.parse(readFileSync(join(DATA_DIR, 'travel-kinshasa.json'), 'utf-8'))

// ── Summary statistics ─────────────────────────────────────────────
const totalPop2025 = fuelData.reduce((s, r) => s + r.pop_2025, 0)
const totalDemand2025 = fuelData.reduce((s, r) => s + r.demand_2025, 0)
const totalDemand2030 = fuelData.reduce((s, r) => s + r.demand_2030, 0)
const totalDemand2040 = fuelData.reduce((s, r) => s + r.demand_2040, 0)
const totalStations: number = fuelGeoJSON.metadata?.featureCount ?? fuelGeoJSON.features.length
const saturatedCommunes = fuelData.filter(r => r.saturated).map(r => r.commune)

const top5Demand = [...fuelData].sort((a, b) => b.demand_2025 - a.demand_2025).slice(0, 5)
const top5DensityKm2 = [...fuelData].sort((a, b) => b.demand_per_km2_2025 - a.demand_per_km2_2025).slice(0, 5)

// ── Point-in-polygon helpers ───────────────────────────────────────
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
  if (geometry.type === 'Polygon') return pointInPolygon(point, geometry.coordinates[0])
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some((poly: number[][][]) => pointInPolygon(point, poly[0]))
  return false
}

// ── Station counts per commune ─────────────────────────────────────
const stationsByCommune = new Map<string, number>()
for (const c of fuelData) stationsByCommune.set(c.commune, 0)

for (const sf of fuelGeoJSON.features) {
  if (sf.geometry?.type !== 'Point') continue
  const coords: [number, number] = sf.geometry.coordinates
  for (const cf of communesGeoJSON.features) {
    const name = cf.properties?.name
    if (!name) continue
    if (pointInMultiPolygon(coords, cf.geometry)) {
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

// ── Travel matrix data ─────────────────────────────────────────────
const travelCommunes = travelData.communes
const diurneDurations = travelData.profiles?.diurne?.durations ?? []
const distances = travelData.distances ?? []

// ── Format helpers ─────────────────────────────────────────────────
function makeFmt(locale: Locale) {
  const loc = locale === 'en' ? 'en-US' : 'fr-FR'
  const fmt = (n: number) => n.toLocaleString(loc)
  const fmtK = (n: number) =>
    n >= 1_000_000
      ? locale === 'en'
        ? `${(n / 1_000_000).toFixed(1)} M`
        : `${(n / 1_000_000).toFixed(1).replace('.', ',')} M`
      : fmt(n)
  return { fmt, fmtK }
}

console.log(`\n📊 Fuel Report Statistics:`)
console.log(`   Population 2025:  ${totalPop2025.toLocaleString('fr-FR')}`)
console.log(`   Demand 2025:      ${totalDemand2025.toLocaleString('fr-FR')} m³/jour`)
console.log(`   Stations:         ${totalStations}`)
console.log(`   Locales:          ${locales.join(', ')}`)

// ── Build report for each locale ───────────────────────────────────
const REPORTS_DIR = join(DATA_DIR, 'reports')
mkdirSync(REPORTS_DIR, { recursive: true })

const indexPath = join(REPORTS_DIR, 'index.json')
let index: { id: string; title: string; slug: string; description: string; createdAt: string; updatedAt: string }[] = []
try { index = JSON.parse(readFileSync(indexPath, 'utf-8')) } catch { /* first run */ }

for (const locale of locales) {
  const msgs = locale === 'en' ? en : fr
  const t = msgs.fuelReport
  const { fmt, fmtK } = makeFmt(locale)
  const dayAbbr = locale === 'en' ? 'd' : 'j'

  // Duration matrix rows
  const communeCol = t.colCommune
  const durationRows: Record<string, unknown>[] = travelCommunes.map((from, i) => {
    const row: Record<string, unknown> = { [communeCol]: from }
    travelCommunes.forEach((to, j) => { row[to] = Math.round(diurneDurations[i]?.[j] ?? 0) })
    return row
  })
  const distanceRows: Record<string, unknown>[] = travelCommunes.map((from, i) => {
    const row: Record<string, unknown> = { [communeCol]: from }
    travelCommunes.forEach((to, j) => { row[to] = Math.round((distances[i]?.[j] ?? 0) * 10) / 10 })
    return row
  })
  const matrixColumns = [
    { field: communeCol, label: communeCol },
    ...travelCommunes.map(c => ({ field: c, label: c, format: 'number' as const, decimals: 0 })),
  ]
  const distMatrixColumns = [
    { field: communeCol, label: communeCol },
    ...travelCommunes.map(c => ({ field: c, label: c, format: 'number' as const, decimals: 1 })),
  ]

  const report = new ReportBuilder(t.title)
    .id(locale === 'en' ? 'default-fuel-supply-demand-en' : 'default-fuel-supply-demand')
    .slug(t.slug)
    .description(
      t.description
        .replace('{stations}', String(totalStations))
        .replace('{demand}', fmt(totalDemand2025)),
    )

    // ── Introduction ──
    .h1(t.h1)
    .text(
      t.intro1
        .replace('{pop}', fmtK(totalPop2025))
        .replace('{demand}', fmt(totalDemand2025))
        .replace('{demandL}', fmt(totalDemand2025 * 1000))
        .replace('{demand2030}', fmt(totalDemand2030))
        .replace('{demand2040}', fmt(totalDemand2040)),
    )
    .text(t.intro2.replace('{stations}', String(totalStations)))

    // ── Demand by commune ──
    .h2(t.demandTitle)
    .text(
      t.demandText.replace('{top5}',
        top5Demand.map(r => `${r.commune} (${r.demand_2025} m³/${dayAbbr})`).join(', '),
      ),
    )
    .table('fuel-demand.json', {
      title: t.demandTableTitle,
      columns: [
        { field: 'commune', label: t.colCommune },
        { field: 'pop_2025', label: t.colPop, format: 'number', decimals: 0 },
        { field: 'demand_2025', label: t.col2025, format: 'number', decimals: 0 },
        { field: 'demand_2030', label: t.col2030, format: 'number', decimals: 0 },
        { field: 'demand_2040', label: t.col2040, format: 'number', decimals: 0 },
      ],
      sortBy: 'demand_2025',
      sortDir: 'desc',
    })
    .barChart('fuel-demand.json', {
      title: t.demandChartTitle,
      labelField: 'commune',
      datasets: [
        { field: 'demand_2025', label: '2025', color: '#1976d2' },
        { field: 'demand_2030', label: '2030', color: '#fb8c00' },
        { field: 'demand_2040', label: '2040', color: '#c62828' },
      ],
    })

    // ── Demand density ──
    .h2(t.densityTitle)
    .text(
      t.densityText.replace('{top5}',
        top5DensityKm2.map(r => `${r.commune} (${r.demand_per_km2_2025.toFixed(1)} m³/${dayAbbr}/km²)`).join(', '),
      ),
    )
    .table('fuel-demand.json', {
      title: t.densityTableTitle,
      columns: [
        { field: 'commune', label: t.colCommune },
        { field: 'area_km2', label: t.colSurface, format: 'number', decimals: 2 },
        { field: 'demand_per_capita_L_2025', label: t.colPerCapita, format: 'number', decimals: 4 },
        { field: 'demand_per_km2_2025', label: t.colPerKm2, format: 'number', decimals: 2 },
      ],
      sortBy: 'demand_per_km2_2025',
      sortDir: 'desc',
    })
    .barChart('fuel-demand.json', {
      title: t.densityChartTitle,
      labelField: 'commune',
      datasets: [
        { field: 'demand_per_capita_L_2025', label: t.colPerCapita, color: '#7b1fa2' },
      ],
    })

    // ── Supply ──
    .h2(t.supplyTitle)
    .text(
      t.supplyText
        .replace('{stations}', String(totalStations))
        .replace('{topStations}', communesWithStations.slice(0, 5).map(([n, c]) => `${n} (${c})`).join(', '))
        .replace('{noStationText}',
          communesWithoutStations.length > 0
            ? t.noStationSome
                .replace('{count}', String(communesWithoutStations.length))
                .replace('{names}', communesWithoutStations.join(', '))
            : t.noStationAll,
        ),
    )
    .text(t.supplyWarning)

    // ── Supply/demand imbalance ──
    .h2(t.imbalanceTitle)
    .text(
      t.saturation
        .replace('{count}', String(saturatedCommunes.length))
        .replace('{names}', saturatedCommunes.join(', ')),
    )
    .text(t.periphery)
    .text(
      t.growth
        .replace('{from}', fmt(totalDemand2025))
        .replace('{to}', fmt(totalDemand2040))
        .replace('{pct}', String(Math.round((totalDemand2040 / totalDemand2025 - 1) * 100))),
    )

    // ── Travel times and distances ──
    .h2(t.travelTitle)
    .text(t.travelText)
    .inlineTable(durationRows, {
      title: t.durationTableTitle,
      columns: matrixColumns,
    })
    .inlineTable(distanceRows, {
      title: t.distanceTableTitle,
      columns: distMatrixColumns,
    })

    // ── Methodology ──
    .h2(t.methodologyTitle)
    .text(t.methodologyText1)
    .text(t.methodologyText2)

    // ── Sources ──
    .dataSource(t.srcDemandData, {
      description: t.srcDemandDesc,
      date: '2026-02-21',
    })
    .dataSource(t.srcStationsData, {
      description: t.srcStationsDesc.replace('{count}', String(totalStations)),
      url: 'https://www.openstreetmap.org/',
      date: '2026-02-19',
    })
    .dataSource(t.srcCommunesData, {
      description: t.srcCommunesDesc,
      url: 'https://www.openstreetmap.org/',
      date: '2026-02-18',
    })
    .dataSource(t.srcTravelData, {
      description: t.srcTravelDesc,
      date: '2026-02-23',
    })
    .source(t.srcJica, {
      description: t.srcJicaDesc,
      date: '2019',
    })
    .source(t.srcMinEco, {
      description: t.srcMinEcoDesc,
      date: locale === 'en' ? 'April 2025' : 'Avril 2025',
    })
    .source(t.srcEds, {
      description: t.srcEdsDesc,
      date: '2024',
    })
    .source(t.srcSnel, {
      description: t.srcSnelDesc,
    })
    .source(t.srcUn, {
      description: t.srcUnDesc,
      url: 'https://population.un.org/wup/',
      date: '2024',
    })
    .source(t.srcMacrotrends, {
      description: t.srcMacrotrendsDesc,
      url: 'https://www.macrotrends.net/cities/20839/kinshasa/population',
      date: '2025',
    })
    .source(t.srcOsm, {
      description: t.srcOsmDesc,
      url: 'https://overpass-turbo.eu/',
      date: '2026-02-19',
    })
    .sources(t.sourcesTitle)
    .build()

  // ── Write output ──
  const reportPath = join(REPORTS_DIR, `${report.slug}.json`)
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')

  const summary = {
    id: report.id,
    title: report.title,
    slug: report.slug,
    description: report.description,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  }
  const existingIdx = index.findIndex(r => r.slug === report.slug)
  if (existingIdx >= 0) index[existingIdx] = summary
  else index.push(summary)

  console.log(`\n✅ [${locale.toUpperCase()}] Report written to ${reportPath}`)
  console.log(`   Title:  ${report.title}`)
  console.log(`   Slug:   ${report.slug}`)
  console.log(`   Blocks: ${report.blocks.length}`)
}

writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8')
console.log(`\n📁 Index updated: ${indexPath}`)

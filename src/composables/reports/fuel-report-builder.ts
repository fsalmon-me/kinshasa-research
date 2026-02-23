/**
 * Browser-side fuel report generator.
 *
 * Fetches data via HTTP (public/data/), computes statistics,
 * and builds a complete report using ReportBuilder.
 *
 * Supports multilingual generation (fr/en) via locale messages.
 * Called from the admin Report Editor UI.
 */
import { ReportBuilder } from '@/lib/report-builder'
import type { Report } from '@/types/report'
import fr from '@/i18n/fr'
import en from '@/i18n/en'

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

export type Locale = 'fr' | 'en'

export interface GenerateResult {
  report: Report
  logs: string[]
}

type Messages = typeof fr

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

function pointInMultiPolygon(point: [number, number], geometry: { type: string; coordinates: number[][][][] | number[][][] }): boolean {
  if (geometry.type === 'Polygon') {
    return pointInPolygon(point, (geometry.coordinates as number[][][])[0])
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as number[][][][]).some(poly => pointInPolygon(point, poly[0]))
  }
  return false
}

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

// ── Main generator ─────────────────────────────────────────────────

export async function buildFuelReport(locale: Locale = 'fr'): Promise<GenerateResult> {
  const msgs: Messages = locale === 'en' ? en : fr
  const t = msgs.fuelReport
  const { fmt, fmtK } = makeFmt(locale)

  const logs: string[] = []
  const log = (msg: string) => { logs.push(msg); console.log(`[fuel-report] ${msg}`) }

  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')

  log(t.logLoading)
  const [fuelData, fuelGeoJSON, communesGeoJSON, travelData] = await Promise.all([
    fetch(`${base}/data/fuel-demand.json`).then(r => r.json()) as Promise<FuelRecord[]>,
    fetch(`${base}/data/fuel.geojson`).then(r => r.json()),
    fetch(`${base}/data/communes.geojson`).then(r => r.json()),
    fetch(`${base}/data/travel-kinshasa.json`).then(r => r.json()) as Promise<TravelData>,
  ])

  // ── Summary statistics ──
  const totalPop2025 = fuelData.reduce((s, r) => s + r.pop_2025, 0)
  const totalDemand2025 = fuelData.reduce((s, r) => s + r.demand_2025, 0)
  const totalDemand2030 = fuelData.reduce((s, r) => s + r.demand_2030, 0)
  const totalDemand2040 = fuelData.reduce((s, r) => s + r.demand_2040, 0)
  const totalStations: number = fuelGeoJSON.metadata?.featureCount ?? fuelGeoJSON.features.length
  const saturatedCommunes = fuelData.filter(r => r.saturated).map(r => r.commune)

  const top5Demand = [...fuelData].sort((a, b) => b.demand_2025 - a.demand_2025).slice(0, 5)
  const top5DensityKm2 = [...fuelData].sort((a, b) => b.demand_per_km2_2025 - a.demand_per_km2_2025).slice(0, 5)

  log(`Population 2025: ${fmtK(totalPop2025)}`)
  log(`Demand 2025: ${fmt(totalDemand2025)} m³/day`)
  log(`Stations: ${totalStations}`)

  // ── Station counts per commune ──
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

  // ── Build travel matrix inline data ──
  const communes = travelData.communes
  const diurneDurations = travelData.profiles?.diurne?.durations ?? []
  const distances = travelData.distances ?? []

  const communeCol = t.colCommune

  // Duration matrix rows
  const durationRows: Record<string, unknown>[] = communes.map((from, i) => {
    const row: Record<string, unknown> = { [communeCol]: from }
    communes.forEach((to, j) => {
      row[to] = Math.round(diurneDurations[i]?.[j] ?? 0)
    })
    return row
  })

  // Distance matrix rows
  const distanceRows: Record<string, unknown>[] = communes.map((from, i) => {
    const row: Record<string, unknown> = { [communeCol]: from }
    communes.forEach((to, j) => {
      row[to] = Math.round((distances[i]?.[j] ?? 0) * 10) / 10
    })
    return row
  })

  // Matrix columns
  const matrixColumns = [
    { field: communeCol, label: communeCol },
    ...communes.map(c => ({ field: c, label: c, format: 'number' as const, decimals: 0 })),
  ]
  const distMatrixColumns = [
    { field: communeCol, label: communeCol },
    ...communes.map(c => ({ field: c, label: c, format: 'number' as const, decimals: 1 })),
  ]

  // ── Build the report ──
  log(t.logBuilding)

  const dayAbbr = locale === 'en' ? 'd' : 'j'

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
    .text(
      t.intro2.replace('{stations}', String(totalStations)),
    )

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

  log(t.logDone.replace('{count}', String(report.blocks.length)))
  return { report, logs }
}

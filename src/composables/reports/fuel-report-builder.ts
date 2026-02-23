/**
 * Browser-side fuel report generator.
 *
 * Fetches data via HTTP (public/data/), computes statistics,
 * and builds a complete bilingual report using ReportBuilder.
 *
 * Each text field is produced as { fr: "…", en: "…" } so the
 * viewer can display the correct language at render time.
 *
 * Called from the admin Report Editor UI.
 */
import { ReportBuilder } from '@/lib/report-builder'
import type { Report, Localizable } from '@/types/report'
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

interface GdpRecord {
  commune: string
  district: string
  tier: number
  classification: string
  gdp_per_capita_usd: number
}

interface StationCostRecord {
  commune: string
  land_value_usd_m2: number
  land_cost_usd: number
  capex_material_usd: number
  capex_total_usd: number
  opex_monthly_usd: number
}

interface TruckParam {
  parameter: string
  value: number
  unit: string
}

interface RevenueRecord {
  commune: string
  consumption_type: string
  net_fuel_margin_cdf: number
  ancillary_margin_cdf: number
  expected_revenue_cdf: number
  supplier_price_cdf: number
}

export interface GenerateResult {
  report: Report
  logs: string[]
}

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

// ── Bilingual helpers ──────────────────────────────────────────────

/** Build a bilingual { fr, en } Localizable from both locale message sets */
function L(frKey: string, enKey: string): Localizable {
  return { fr: frKey, en: enKey }
}

/** Replace placeholders in both languages */
function Lreplace(frTpl: string, enTpl: string, replacements: Record<string, string>): Localizable {
  let f = frTpl
  let e = enTpl
  for (const [k, v] of Object.entries(replacements)) {
    f = f.split(`{${k}}`).join(v)
    e = e.split(`{${k}}`).join(v)
  }
  return { fr: f, en: e }
}

function fmtFr(n: number) { return n.toLocaleString('fr-FR') }
function fmtEn(n: number) { return n.toLocaleString('en-US') }
function fmtKFr(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} M`
    : fmtFr(n)
}
function fmtKEn(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)} M`
    : fmtEn(n)
}

// Consumption type translation map
const consumptionTypeEN: Record<string, string> = {
  'Mixte premium': 'Premium mixed',
  'Commerce & transport': 'Commerce & transport',
  'Transport dominant': 'Transport dominant',
  'Résidentiel diffus': 'Residential diffuse',
  'Mixte résidentiel': 'Residential mixed',
  'Périurbain motorisé': 'Peri-urban motorised',
  'Résidentiel dense': 'Dense residential',
  'Périurbain extensif': 'Extensive peri-urban',
}

// ── Main generator ─────────────────────────────────────────────────

export async function buildFuelReport(): Promise<GenerateResult> {
  const tFr = fr.fuelReport
  const tEn = en.fuelReport

  const logs: string[] = []
  const log = (msg: string) => { logs.push(msg); console.log(`[fuel-report] ${msg}`) }

  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')

  log(tFr.logLoading)
  const [fuelData, fuelGeoJSON, communesGeoJSON, travelData, gdpData, costData, truckData, revenueData] = await Promise.all([
    fetch(`${base}/data/fuel-demand.json`).then(r => r.json()) as Promise<FuelRecord[]>,
    fetch(`${base}/data/fuel.geojson`).then(r => r.json()),
    fetch(`${base}/data/communes.geojson`).then(r => r.json()),
    fetch(`${base}/data/travel-kinshasa.json`).then(r => r.json()) as Promise<TravelData>,
    fetch(`${base}/data/gdp-commune.json`).then(r => r.json()) as Promise<GdpRecord[]>,
    fetch(`${base}/data/station-costs.json`).then(r => r.json()) as Promise<StationCostRecord[]>,
    fetch(`${base}/data/truck-logistics.json`).then(r => r.json()) as Promise<TruckParam[]>,
    fetch(`${base}/data/fuel-revenue.json`).then(r => r.json()) as Promise<RevenueRecord[]>,
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

  log(`Population 2025: ${fmtKEn(totalPop2025)}`)
  log(`Demand 2025: ${fmtEn(totalDemand2025)} m³/day`)
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

  // Station count inline data
  const stationRows = [...stationsByCommune.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([commune, count]) => ({ commune, stations: count }))

  // ── Build travel matrix inline data ──
  const communes = travelData.communes
  const diurneDurations = travelData.profiles?.diurne?.durations ?? []
  const distances = travelData.distances ?? []

  const colCommune = L(tFr.colCommune, tEn.colCommune)

  // Duration matrix rows — use static key for commune column
  const durationRows: Record<string, unknown>[] = communes.map((from, i) => {
    const row: Record<string, unknown> = { commune: from }
    communes.forEach((to, j) => {
      row[to] = Math.round(diurneDurations[i]?.[j] ?? 0)
    })
    return row
  })

  const distanceRows: Record<string, unknown>[] = communes.map((from, i) => {
    const row: Record<string, unknown> = { commune: from }
    communes.forEach((to, j) => {
      row[to] = Math.round((distances[i]?.[j] ?? 0) * 10) / 10
    })
    return row
  })

  const matrixColumns = [
    { field: 'commune', label: colCommune },
    ...communes.map(c => ({ field: c, label: c, format: 'number' as const, decimals: 0 })),
  ]
  const distMatrixColumns = [
    { field: 'commune', label: colCommune },
    ...communes.map(c => ({ field: c, label: c, format: 'number' as const, decimals: 1 })),
  ]

  // ── Truck logistics inline data ──
  const truckParamLabels: Record<string, Localizable> = {
    capacity: L(tFr.truckCapacity, tEn.truckCapacity),
    loading: L(tFr.truckLoading, tEn.truckLoading),
    unloading: L(tFr.truckUnloading, tEn.truckUnloading),
    cost_per_km: L(tFr.truckCostKm, tEn.truckCostKm),
    labor_per_hour: L(tFr.truckLabor, tEn.truckLabor),
  }
  const truckRows = truckData.map(p => ({
    parameter: truckParamLabels[p.parameter] ?? p.parameter,
    value: p.value,
    unit: p.unit,
  }))

  // ── Revenue inline data with bilingual consumption_type ──
  const revenueRows = revenueData.map(r => ({
    commune: r.commune,
    consumption_type: { fr: r.consumption_type, en: consumptionTypeEN[r.consumption_type] ?? r.consumption_type },
    net_fuel_margin_cdf: r.net_fuel_margin_cdf,
    ancillary_margin_cdf: r.ancillary_margin_cdf,
    expected_revenue_cdf: r.expected_revenue_cdf,
    supplier_price_cdf: r.supplier_price_cdf,
  }))

  // ── Build the report ──
  log(tFr.logBuilding)

  const stationsStr = String(totalStations)
  const demandFr = fmtFr(totalDemand2025)
  const demandEn = fmtEn(totalDemand2025)
  const pctGrowth = String(Math.round((totalDemand2040 / totalDemand2025 - 1) * 100))
  const top5Fr = top5Demand.map(r => `${r.commune} (${r.demand_2025} m³/j)`).join(', ')
  const top5En = top5Demand.map(r => `${r.commune} (${r.demand_2025} m³/d)`).join(', ')
  const top5DenseFr = top5DensityKm2.map(r => `${r.commune} (${r.demand_per_km2_2025.toFixed(1)} m³/j/km²)`).join(', ')
  const top5DenseEn = top5DensityKm2.map(r => `${r.commune} (${r.demand_per_km2_2025.toFixed(1)} m³/d/km²)`).join(', ')
  const topStationsStr = communesWithStations.slice(0, 5).map(([n, c]) => `${n} (${c})`).join(', ')

  const noStationFr = communesWithoutStations.length > 0
    ? tFr.noStationSome.replace('{count}', String(communesWithoutStations.length)).replace('{names}', communesWithoutStations.join(', '))
    : tFr.noStationAll
  const noStationEn = communesWithoutStations.length > 0
    ? tEn.noStationSome.replace('{count}', String(communesWithoutStations.length)).replace('{names}', communesWithoutStations.join(', '))
    : tEn.noStationAll

  const report = new ReportBuilder(L(tFr.title, tEn.title))
    .id('default-fuel-supply-demand')
    .slug(tFr.slug)
    .description(Lreplace(tFr.description, tEn.description, {
      stations: stationsStr,
      demand: demandFr, // numbers same in both — locale-formatted in viewer
    }))

    // ── Introduction ──
    .h1(L(tFr.h1, tEn.h1))
    .text({
      fr: tFr.intro1
        .replace('{pop}', fmtKFr(totalPop2025))
        .replace('{demand}', demandFr)
        .replace('{demandL}', fmtFr(totalDemand2025 * 1000))
        .replace('{demand2030}', fmtFr(totalDemand2030))
        .replace('{demand2040}', fmtFr(totalDemand2040)),
      en: tEn.intro1
        .replace('{pop}', fmtKEn(totalPop2025))
        .replace('{demand}', demandEn)
        .replace('{demandL}', fmtEn(totalDemand2025 * 1000))
        .replace('{demand2030}', fmtEn(totalDemand2030))
        .replace('{demand2040}', fmtEn(totalDemand2040)),
    })
    .text(Lreplace(tFr.intro2, tEn.intro2, { stations: stationsStr }))

    // ── Demand by commune ──
    .h2(L(tFr.demandTitle, tEn.demandTitle))
    .text({ fr: tFr.demandText.replace('{top5}', top5Fr), en: tEn.demandText.replace('{top5}', top5En) })
    .table('fuel-demand.json', {
      title: L(tFr.demandTableTitle, tEn.demandTableTitle),
      columns: [
        { field: 'commune', label: L(tFr.colCommune, tEn.colCommune) },
        { field: 'pop_2025', label: L(tFr.colPop, tEn.colPop), format: 'number', decimals: 0 },
        { field: 'demand_2025', label: L(tFr.col2025, tEn.col2025), format: 'number', decimals: 0 },
        { field: 'demand_2030', label: L(tFr.col2030, tEn.col2030), format: 'number', decimals: 0 },
        { field: 'demand_2040', label: L(tFr.col2040, tEn.col2040), format: 'number', decimals: 0 },
      ],
      sortBy: 'demand_2025',
      sortDir: 'desc',
    })
    .barChart('fuel-demand.json', {
      title: L(tFr.demandChartTitle, tEn.demandChartTitle),
      labelField: 'commune',
      datasets: [
        { field: 'demand_2025', label: '2025', color: '#1976d2' },
        { field: 'demand_2030', label: '2030', color: '#fb8c00' },
        { field: 'demand_2040', label: '2040', color: '#c62828' },
      ],
    })

    // ── Demand density ──
    .h2(L(tFr.densityTitle, tEn.densityTitle))
    .text({ fr: tFr.densityText.replace('{top5}', top5DenseFr), en: tEn.densityText.replace('{top5}', top5DenseEn) })
    .table('fuel-demand.json', {
      title: L(tFr.densityTableTitle, tEn.densityTableTitle),
      columns: [
        { field: 'commune', label: L(tFr.colCommune, tEn.colCommune) },
        { field: 'area_km2', label: L(tFr.colSurface, tEn.colSurface), format: 'number', decimals: 2 },
        { field: 'demand_per_capita_L_2025', label: L(tFr.colPerCapita, tEn.colPerCapita), format: 'number', decimals: 4 },
        { field: 'demand_per_km2_2025', label: L(tFr.colPerKm2, tEn.colPerKm2), format: 'number', decimals: 2 },
      ],
      sortBy: 'demand_per_km2_2025',
      sortDir: 'desc',
    })
    .barChart('fuel-demand.json', {
      title: L(tFr.densityChartTitle, tEn.densityChartTitle),
      labelField: 'commune',
      datasets: [
        { field: 'demand_per_capita_L_2025', label: L(tFr.colPerCapita, tEn.colPerCapita), color: '#7b1fa2' },
      ],
    })

    // ── Supply ──
    .h2(L(tFr.supplyTitle, tEn.supplyTitle))
    .text({
      fr: tFr.supplyText
        .replace('{stations}', stationsStr)
        .replace('{topStations}', topStationsStr)
        .replace('{noStationText}', noStationFr),
      en: tEn.supplyText
        .replace('{stations}', stationsStr)
        .replace('{topStations}', topStationsStr)
        .replace('{noStationText}', noStationEn),
    })
    .text(L(tFr.supplyWarning, tEn.supplyWarning))

    // ── Stations per commune (NEW) ──
    .h2(L(tFr.stationsTitle, tEn.stationsTitle))
    .text(L(tFr.stationsText, tEn.stationsText))
    .inlineTable(stationRows, {
      title: L(tFr.stationsTableTitle, tEn.stationsTableTitle),
      columns: [
        { field: 'commune', label: L(tFr.colCommune, tEn.colCommune) },
        { field: 'stations', label: L(tFr.colStations, tEn.colStations), format: 'number', decimals: 0 },
      ],
      sortBy: 'stations',
      sortDir: 'desc',
    })

    // ── Supply/demand imbalance ──
    .h2(L(tFr.imbalanceTitle, tEn.imbalanceTitle))
    .text(Lreplace(tFr.saturation, tEn.saturation, {
      count: String(saturatedCommunes.length),
      names: saturatedCommunes.join(', '),
    }))
    .text(L(tFr.periphery, tEn.periphery))
    .text({
      fr: tFr.growth.replace('{from}', demandFr).replace('{to}', fmtFr(totalDemand2040)).replace('{pct}', pctGrowth),
      en: tEn.growth.replace('{from}', demandEn).replace('{to}', fmtEn(totalDemand2040)).replace('{pct}', pctGrowth),
    })

    // ── GDP per capita (NEW) ──
    .h2(L(tFr.gdpTitle, tEn.gdpTitle))
    .text(L(tFr.gdpText, tEn.gdpText))
    .inlineTable(gdpData as unknown as Record<string, unknown>[], {
      title: L(tFr.gdpTableTitle, tEn.gdpTableTitle),
      columns: [
        { field: 'commune', label: L(tFr.colCommune, tEn.colCommune) },
        { field: 'district', label: L(tFr.colDistrict, tEn.colDistrict) },
        { field: 'tier', label: L(tFr.colTier, tEn.colTier), format: 'number', decimals: 0 },
        { field: 'classification', label: L(tFr.colClassification, tEn.colClassification) },
        { field: 'gdp_per_capita_usd', label: L(tFr.colGdpPerCapita, tEn.colGdpPerCapita), format: 'number', decimals: 0 },
      ],
      sortBy: 'gdp_per_capita_usd',
      sortDir: 'desc',
    })
    .barChart('gdp-commune.json', {
      title: L(tFr.gdpChartTitle, tEn.gdpChartTitle),
      labelField: 'commune',
      datasets: [
        { field: 'gdp_per_capita_usd', label: L(tFr.colGdpPerCapita, tEn.colGdpPerCapita), color: '#2e7d32' },
      ],
    })

    // ── CAPEX / OPEX (NEW) ──
    .h2(L(tFr.capexTitle, tEn.capexTitle))
    .text(L(tFr.capexText, tEn.capexText))
    .inlineTable(costData as unknown as Record<string, unknown>[], {
      title: L(tFr.capexTableTitle, tEn.capexTableTitle),
      columns: [
        { field: 'commune', label: L(tFr.colCommune, tEn.colCommune) },
        { field: 'land_value_usd_m2', label: L(tFr.colLandValue, tEn.colLandValue), format: 'number', decimals: 0 },
        { field: 'land_cost_usd', label: L(tFr.colLandCost, tEn.colLandCost), format: 'number', decimals: 0 },
        { field: 'capex_material_usd', label: L(tFr.colCapexMaterial, tEn.colCapexMaterial), format: 'number', decimals: 0 },
        { field: 'capex_total_usd', label: L(tFr.colCapexTotal, tEn.colCapexTotal), format: 'number', decimals: 0 },
        { field: 'opex_monthly_usd', label: L(tFr.colOpex, tEn.colOpex), format: 'number', decimals: 0 },
      ],
      sortBy: 'capex_total_usd',
      sortDir: 'desc',
    })
    .barChart('station-costs.json', {
      title: L(tFr.capexChartTitle, tEn.capexChartTitle),
      labelField: 'commune',
      datasets: [
        { field: 'capex_total_usd', label: L(tFr.colCapexTotal, tEn.colCapexTotal), color: '#e65100' },
      ],
    })

    // ── Truck logistics (NEW) ──
    .h2(L(tFr.truckTitle, tEn.truckTitle))
    .text(L(tFr.truckText, tEn.truckText))
    .inlineTable(truckRows, {
      title: L(tFr.truckTableTitle, tEn.truckTableTitle),
      columns: [
        { field: 'parameter', label: L(tFr.colParameter, tEn.colParameter) },
        { field: 'value', label: L(tFr.colValue, tEn.colValue), format: 'number', decimals: 2 },
        { field: 'unit', label: L(tFr.colUnit, tEn.colUnit) },
      ],
    })

    // ── Revenue per liter (NEW) ──
    .h2(L(tFr.revenueTitle, tEn.revenueTitle))
    .text(L(tFr.revenueText, tEn.revenueText))
    .inlineTable(revenueRows, {
      title: L(tFr.revenueTableTitle, tEn.revenueTableTitle),
      columns: [
        { field: 'commune', label: L(tFr.colCommune, tEn.colCommune) },
        { field: 'consumption_type', label: L(tFr.colConsumptionType, tEn.colConsumptionType) },
        { field: 'net_fuel_margin_cdf', label: L(tFr.colFuelMargin, tEn.colFuelMargin), format: 'number', decimals: 0 },
        { field: 'ancillary_margin_cdf', label: L(tFr.colAncillaryMargin, tEn.colAncillaryMargin), format: 'number', decimals: 0 },
        { field: 'expected_revenue_cdf', label: L(tFr.colExpectedRevenue, tEn.colExpectedRevenue), format: 'number', decimals: 0 },
        { field: 'supplier_price_cdf', label: L(tFr.colSupplierPrice, tEn.colSupplierPrice), format: 'number', decimals: 0 },
      ],
      sortBy: 'expected_revenue_cdf',
      sortDir: 'desc',
    })
    .barChart('fuel-revenue.json', {
      title: L(tFr.revenueChartTitle, tEn.revenueChartTitle),
      labelField: 'commune',
      datasets: [
        { field: 'expected_revenue_cdf', label: L(tFr.colExpectedRevenue, tEn.colExpectedRevenue), color: '#00695c' },
      ],
    })

    // ── Travel times and distances ──
    .h2(L(tFr.travelTitle, tEn.travelTitle))
    .text(L(tFr.travelText, tEn.travelText))
    .inlineTable(durationRows, {
      title: L(tFr.durationTableTitle, tEn.durationTableTitle),
      columns: matrixColumns,
    })
    .inlineTable(distanceRows, {
      title: L(tFr.distanceTableTitle, tEn.distanceTableTitle),
      columns: distMatrixColumns,
    })

    // ── Methodology ──
    .h2(L(tFr.methodologyTitle, tEn.methodologyTitle))
    .text(L(tFr.methodologyText1, tEn.methodologyText1))
    .text(L(tFr.methodologyText2, tEn.methodologyText2))
    .text(L(tFr.methodologyGdp, tEn.methodologyGdp))
    .text(L(tFr.methodologyCosts, tEn.methodologyCosts))
    .text(L(tFr.methodologyRevenue, tEn.methodologyRevenue))

    // ── Sources ──
    .dataSource(L(tFr.srcDemandData, tEn.srcDemandData), {
      description: L(tFr.srcDemandDesc, tEn.srcDemandDesc),
      date: '2026-02-21',
    })
    .dataSource(L(tFr.srcStationsData, tEn.srcStationsData), {
      description: Lreplace(tFr.srcStationsDesc, tEn.srcStationsDesc, { count: stationsStr }),
      url: 'https://www.openstreetmap.org/',
      date: '2026-02-19',
    })
    .dataSource(L(tFr.srcCommunesData, tEn.srcCommunesData), {
      description: L(tFr.srcCommunesDesc, tEn.srcCommunesDesc),
      url: 'https://www.openstreetmap.org/',
      date: '2026-02-18',
    })
    .dataSource(L(tFr.srcTravelData, tEn.srcTravelData), {
      description: L(tFr.srcTravelDesc, tEn.srcTravelDesc),
      date: '2026-02-23',
    })
    .source(L(tFr.srcJica, tEn.srcJica), {
      description: L(tFr.srcJicaDesc, tEn.srcJicaDesc),
      date: '2019',
    })
    .source(L(tFr.srcMinEco, tEn.srcMinEco), {
      description: L(tFr.srcMinEcoDesc, tEn.srcMinEcoDesc),
      date: '2025-04',
    })
    .source(L(tFr.srcEds, tEn.srcEds), {
      description: L(tFr.srcEdsDesc, tEn.srcEdsDesc),
      date: '2024',
    })
    .source(L(tFr.srcSnel, tEn.srcSnel), {
      description: L(tFr.srcSnelDesc, tEn.srcSnelDesc),
    })
    .source(L(tFr.srcUn, tEn.srcUn), {
      description: L(tFr.srcUnDesc, tEn.srcUnDesc),
      url: 'https://population.un.org/wup/',
      date: '2024',
    })
    .source(L(tFr.srcMacrotrends, tEn.srcMacrotrends), {
      description: L(tFr.srcMacrotrendsDesc, tEn.srcMacrotrendsDesc),
      url: 'https://www.macrotrends.net/cities/20839/kinshasa/population',
      date: '2025',
    })
    .source(L(tFr.srcOsm, tEn.srcOsm), {
      description: L(tFr.srcOsmDesc, tEn.srcOsmDesc),
      url: 'https://overpass-turbo.eu/',
      date: '2026-02-19',
    })
    // New external sources
    .source(L(tFr.srcWorldBank, tEn.srcWorldBank), {
      description: L(tFr.srcWorldBankDesc, tEn.srcWorldBankDesc),
      url: 'https://data.worldbank.org/country/CD',
      date: '2024',
    })
    .source(L(tFr.srcTradingEconomics, tEn.srcTradingEconomics), {
      description: L(tFr.srcTradingEconomicsDesc, tEn.srcTradingEconomicsDesc),
      url: 'https://tradingeconomics.com/congo/gdp-per-capita',
      date: '2024',
    })
    .source(L(tFr.srcInsDhs, tEn.srcInsDhs), {
      description: L(tFr.srcInsDhsDesc, tEn.srcInsDhsDesc),
      date: '2024',
    })
    .source(L(tFr.srcNumbeo, tEn.srcNumbeo), {
      description: L(tFr.srcNumbeoDesc, tEn.srcNumbeoDesc),
      url: 'https://www.numbeo.com/cost-of-living/in/Kinshasa',
      date: '2024',
    })
    .source(L(tFr.srcPaylab, tEn.srcPaylab), {
      description: L(tFr.srcPaylabDesc, tEn.srcPaylabDesc),
      url: 'https://www.paylab.com/',
      date: '2024',
    })
    .source(L(tFr.srcSepCongo, tEn.srcSepCongo), {
      description: L(tFr.srcSepCongoDesc, tEn.srcSepCongoDesc),
      date: '2024',
    })
    .source(L(tFr.srcTexaf, tEn.srcTexaf), {
      description: L(tFr.srcTexafDesc, tEn.srcTexafDesc),
      date: '2024',
    })
    .source(L(tFr.srcMinPlan, tEn.srcMinPlan), {
      description: L(tFr.srcMinPlanDesc, tEn.srcMinPlanDesc),
      date: '2024',
    })
    .source(L(tFr.srcArpce, tEn.srcArpce), {
      description: L(tFr.srcArpceDesc, tEn.srcArpceDesc),
      date: '2024',
    })
    .sources(L(tFr.sourcesTitle, tEn.sourcesTitle))
    .build()

  log(tFr.logDone.replace('{count}', String(report.blocks.length)))
  return { report, logs }
}

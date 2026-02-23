/**
 * build-travel-profiles.ts
 *
 * Reads the raw OSRM matrix (travel-osrm.json) and produces a corrected
 * multi-profile travel-time dataset (travel-kinshasa.json) that reflects
 * actual Kinshasa driving conditions.
 *
 * Methodology (from "routes timing.txt"):
 *   1. Matrice A — Speed cap: OSRM free-flow speeds (~49 km/h avg) are
 *      unrealistic. We cap the base speed to 40 km/h (Banque Mondiale
 *      reference: 14 km/h average intercommunal speed). Base durations are
 *      recalculated: duration_base = distance_km / (BASE_SPEED_KMH / 60).
 *   2. Matrice B — Temporal coefficients: 5 time profiles each apply a
 *      coefficient to the base speed. Lower coefficient = more congestion.
 *      duration_profile = duration_base / coefficient
 *   3. Matrice C — Node penalties (Grand Marché +25 min, Rond-Point Victoire
 *      +15 min, etc.) are NOT applied here because we lack per-route geometry.
 *      They are documented in the metadata for future per-segment routing.
 *
 * Sources:
 *   - Banque Mondiale (2018): Revue de l'urbanisation en RDC — 14 km/h avg
 *   - JICA / PDTK (2019): Plan Directeur des Transports Urbains de Kinshasa
 *   - ESI Preprints (Déc. 2025) — Mfewou A. et al.: Mobilité Afrique Centrale
 *
 * Usage: npx tsx scripts/build-travel-profiles.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ── Configuration ──────────────────────────────────────────────────────

/** Base speed for corrected durations (km/h) — Banque Mondiale diurne ref */
const BASE_SPEED_KMH = 40

/** Temporal profiles from Matrice B */
const PROFILES = {
  nuit: {
    label: 'Nuit (00h–05h)',
    hours: '00h00 – 05h00',
    coeff: 1.00,
    speedRange: '30–40 km/h',
    traffic: 'Fluide',
  },
  pointe_matin: {
    label: 'Hyper-pointe matin (07h–09h)',
    hours: '07h00 – 09h00',
    coeff: 0.25,
    speedRange: '8–10 km/h',
    traffic: 'Hyper-congestion',
  },
  diurne: {
    label: 'Journée (09h–16h)',
    hours: '09h00 – 16h00',
    coeff: 0.35,
    speedRange: '12–14 km/h',
    traffic: 'Activité',
  },
  pointe_soir: {
    label: 'Hyper-pointe soir (16h–20h)',
    hours: '16h00 – 20h00',
    coeff: 0.25,
    speedRange: '8–10 km/h',
    traffic: 'Hyper-congestion',
  },
  soiree: {
    label: 'Soirée (20h–00h)',
    hours: '20h00 – 00h00',
    coeff: 0.60,
    speedRange: '18–24 km/h',
    traffic: 'Ralentissement',
  },
} as const

// TODO: vehicleType dimension (camion / voiture / moto / vélo / à pied)
// Future: apply per-vehicle speed multipliers on top of temporal profiles

// ── Main ───────────────────────────────────────────────────────────────

const dataDir = resolve(__dirname, '..', 'public', 'data')
const osrmPath = resolve(dataDir, 'travel-osrm.json')
const outPath = resolve(dataDir, 'travel-kinshasa.json')

interface OsrmData {
  metadata: Record<string, unknown>
  communes: string[]
  durations: number[][]
  distances: number[][]
}

const osrm: OsrmData = JSON.parse(readFileSync(osrmPath, 'utf-8'))
const { communes, distances } = osrm
const n = communes.length

console.log(`[travel] Loaded OSRM data: ${n} communes`)

// ── Step 1: Build base corrected durations ─────────────────────────

/** For each OD pair, base_duration = distance / (BASE_SPEED / 60) minutes */
const baseDurations: number[][] = []
for (let i = 0; i < n; i++) {
  const row: number[] = []
  for (let j = 0; j < n; j++) {
    if (i === j) {
      row.push(0)
    } else {
      const distKm = distances[i][j]
      // duration in minutes at BASE_SPEED
      const dur = distKm / (BASE_SPEED_KMH / 60)
      row.push(Math.round(dur * 10) / 10) // 1 decimal
    }
  }
  baseDurations.push(row)
}

// Quick stats
const allBase = baseDurations.flat().filter(v => v > 0)
const avgBase = allBase.reduce((a, b) => a + b, 0) / allBase.length
console.log(`[travel] Base durations (${BASE_SPEED_KMH} km/h): avg=${avgBase.toFixed(1)} min`)

// ── Step 2: Apply temporal coefficients ────────────────────────────

type ProfileKey = keyof typeof PROFILES

const profiles: Record<string, {
  label: string
  hours: string
  coeff: number
  speedRange: string
  traffic: string
  durations: number[][]
}> = {}

for (const [key, meta] of Object.entries(PROFILES)) {
  const durations: number[][] = []
  for (let i = 0; i < n; i++) {
    const row: number[] = []
    for (let j = 0; j < n; j++) {
      if (i === j) {
        row.push(0)
      } else {
        // Higher coeff = faster → shorter travel time
        // duration = base_duration / coeff
        const dur = baseDurations[i][j] / meta.coeff
        row.push(Math.round(dur))
      }
    }
    row[i] = 0 // ensure diagonal is 0
    durations.push(row)
  }
  profiles[key] = { ...meta, durations }

  // Stats
  const vals = durations.flat().filter(v => v > 0)
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const effSpeed = distances.flat().filter((_, idx) => {
    const i = Math.floor(idx / n), j = idx % n
    return i !== j
  })
  console.log(`[travel] Profile ${key} (×${meta.coeff}): avg=${avg.toFixed(0)} min`)
}

// ── Step 3: Build output ───────────────────────────────────────────

const output = {
  metadata: {
    source: 'Modèle corrigé — OSRM + coefficients de congestion Kinshasa',
    basedOn: 'travel-osrm.json (OSRM free-flow matrix)',
    computedAt: new Date().toISOString(),
    methodology: [
      `Matrice A — Plafond de vitesse: les durées OSRM (vitesse moyenne ~49 km/h) sont recalculées avec un plafond de ${BASE_SPEED_KMH} km/h basé sur les vitesses réelles des axes bitumés (trunk/primary).`,
      'Matrice B — Coefficients temporels: 5 profils horaires appliquent un coefficient réducteur sur la vitesse de base pour simuler les variations diurnes.',
      'Matrice C — Pénalités de nœuds (Grand Marché +25 min, Rond-Point Victoire +15 min, Rond-Point Ngaba +15 min, Marché de la Liberté +20 min, Kingasani +15 min): NON appliquées à ce niveau agrégé OD. Documentées pour application future en routage per-segment.',
    ].join(' '),
    units: {
      durations: 'minutes',
      distances: 'km',
    },
    sources: [
      {
        ref: 'Banque Mondiale (2018)',
        title: 'Revue de l\'urbanisation en République Démocratique du Congo',
        contribution: 'Validation de la vitesse moyenne intercommunale à 14 km/h',
      },
      {
        ref: 'JICA / PDTK (2019)',
        title: 'Plan Directeur des Transports Urbains de Kinshasa — Horizon 2030-2040',
        contribution: 'Vitesses en flux libre par type de voirie, débits maximaux (137 véh/h sur Blvd Lumumba)',
      },
      {
        ref: 'ESI Preprints (Décembre 2025)',
        title: 'Mobilité et circulation dans les villes d\'Afrique Centrale — Mfewou A. et al.',
        contribution: 'Temps de trajet moyen par ménage: 1h45, impact du transport informel',
      },
    ],
    nodePenalties: [
      { zone: 'Marché de la Liberté / Masina', cause: 'Minibus, vendeurs, piétons', penalty: '15–20 min' },
      { zone: 'Rond-Point Victoire (Kalamu)', cause: 'Hub informel (Wewas, taxis)', penalty: '12–15 min' },
      { zone: 'Rond-Point Ngaba', cause: 'Goulot d\'étranglement Sud', penalty: '15 min' },
      { zone: 'Grand Marché (Zando)', cause: 'Saturation commerciale diurne', penalty: '25 min' },
      { zone: 'Kingasani (Pascal)', cause: 'Marché spontané sur la chaussée', penalty: '10–15 min' },
    ],
    // TODO: Matrice D — paramètres logistiques (coût/km, coût/heure congestion)
    // TODO: vehicleTypes: ['car', 'truck', 'moto', 'bike', 'walk']
  },
  communes,
  distances, // same as OSRM — geometry unchanged
  defaultProfile: 'diurne',
  profiles,
}

writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')
console.log(`\n✅ Written ${outPath}`)
console.log(`   ${n} communes × ${Object.keys(profiles).length} profiles`)

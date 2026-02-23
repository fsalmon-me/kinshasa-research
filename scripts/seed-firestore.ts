/**
 * Seed Firestore communes collection from local JSON data.
 * Usage: npx tsx scripts/seed-firestore.ts
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or firebase login
 * This script uses the Firebase Admin SDK pattern but through the client SDK
 * since we're in test mode (allow write: if true).
 */
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'public', 'data')

// Firebase config (same as src/firebase.ts)
const firebaseConfig = {
  apiKey: 'AIzaSyD3E6BPhObT3bkgbtk0gRyF4zdi5dzuX6E',
  authDomain: 'kinshasa-research.firebaseapp.com',
  projectId: 'kinshasa-research',
  storageBucket: 'kinshasa-research.firebasestorage.app',
  messagingSenderId: '658504105676',
  appId: '1:658504105676:web:9109c37541a26fbece0c69',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Load local data
const population = JSON.parse(readFileSync(join(dataDir, 'population.json'), 'utf-8'))
const fuelDemand = JSON.parse(readFileSync(join(dataDir, 'fuel-demand.json'), 'utf-8'))

// Build fuel-demand lookup
const demandMap = new Map()
for (const entry of fuelDemand) {
  demandMap.set(entry.commune, entry)
}

console.log('🔥 Seeding Firestore communes collection...\n')

const communesCol = collection(db, 'communes')

let seeded = 0
for (const pop of population) {
  const demand = demandMap.get(pop.commune) ?? {}
  const data = {
    cluster: pop.cluster,
    area_km2: pop.area_km2 ?? 0,
    pop_2017: pop.pop_2017,
    pop_2025: pop.pop_2025,
    pop_2030: pop.pop_2030,
    pop_2040: pop.pop_2040,
    density_2025: pop.density_2025 ?? 0,
    density_2030: pop.density_2030 ?? 0,
    density_2040: pop.density_2040 ?? 0,
    demand_2025: demand.demand_2025 ?? 0,
    demand_2030: demand.demand_2030 ?? 0,
    demand_2040: demand.demand_2040 ?? 0,
    saturated: demand.saturated ?? false,
  }

  await setDoc(doc(communesCol, pop.commune), data, { merge: true })
  console.log(`  ✅ ${pop.commune}`)
  seeded++
}

console.log(`\n🎉 Seeded ${seeded} communes to Firestore`)

// Verify
const snap = await getDocs(communesCol)
console.log(`📊 Firestore communes count: ${snap.size}`)

process.exit(0)

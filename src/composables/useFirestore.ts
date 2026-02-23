import { db } from '@/firebase'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import type { FeatureOverride } from '@/types/layer'

// =====================================
// Communes
// =====================================

export interface CommuneDoc {
  name: string
  cluster: string
  area_km2: number
  pop_2017: number
  pop_2025: number
  pop_2030: number
  pop_2040: number
  density_2025: number
  density_2030: number
  density_2040: number
  demand_2025?: number
  demand_2030?: number
  demand_2040?: number
  saturated?: boolean
}

const communesCol = collection(db, 'communes')

/** Fetch all commune documents from Firestore */
export async function fetchCommunes(): Promise<CommuneDoc[]> {
  const snap = await getDocs(communesCol)
  return snap.docs.map(d => ({ name: d.id, ...d.data() } as CommuneDoc))
}

/** Upsert a single commune document */
export async function upsertCommune(commune: CommuneDoc): Promise<void> {
  const { name, ...data } = commune
  await setDoc(doc(communesCol, name), data, { merge: true })
}

/** Seed all communes from local data arrays */
export async function seedCommunes(communes: CommuneDoc[]): Promise<void> {
  await Promise.all(communes.map(c => upsertCommune(c)))
}

// =====================================
// Metadata overrides
// =====================================

/** Save a feature override to Firestore */
export async function saveOverride(
  layerId: string,
  featureKey: string,
  override: FeatureOverride,
): Promise<void> {
  const ref = doc(db, 'overrides', layerId, 'features', featureKey)
  await setDoc(ref, override, { merge: true })
}

/** Load all overrides for a specific layer */
export async function loadOverrides(
  layerId: string,
): Promise<Record<string, FeatureOverride>> {
  const col = collection(db, 'overrides', layerId, 'features')
  const snap = await getDocs(col)
  const result: Record<string, FeatureOverride> = {}
  for (const d of snap.docs) {
    result[d.id] = d.data() as FeatureOverride
  }
  return result
}

/** Load overrides for ALL layers */
export async function loadAllOverrides(): Promise<Record<string, Record<string, FeatureOverride>>> {
  // Get all layerId docs under overrides/
  const overridesCol = collection(db, 'overrides')
  const layerSnap = await getDocs(overridesCol)
  const result: Record<string, Record<string, FeatureOverride>> = {}

  await Promise.all(
    layerSnap.docs.map(async (layerDoc) => {
      const layerId = layerDoc.id
      result[layerId] = await loadOverrides(layerId)
    }),
  )
  return result
}

/** Watch overrides for a layer in real-time */
export function watchOverrides(
  layerId: string,
  callback: (overrides: Record<string, FeatureOverride>) => void,
): Unsubscribe {
  const col = collection(db, 'overrides', layerId, 'features')
  return onSnapshot(col, (snap) => {
    const result: Record<string, FeatureOverride> = {}
    for (const d of snap.docs) {
      result[d.id] = d.data() as FeatureOverride
    }
    callback(result)
  })
}

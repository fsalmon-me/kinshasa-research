/**
 * useFirestoreData — Read/write data files as Firestore documents.
 *
 * Collection: `data-files`
 * Document id: filename (e.g. "population.json")
 * Fields: { content: string (JSON), updatedAt: Timestamp, updatedBy: string }
 *
 * Files > 1 MiB cannot be stored (Firestore doc limit).
 * The store tries Firestore first, falling back to static hosting.
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { auth } from '@/firebase'

const COLLECTION = 'data-files'

/** Filenames that are too large for Firestore (> 1 MiB) */
const STATIC_ONLY = new Set([
  'communes.geojson',
  'roads-major.geojson',
  'roads-minor.geojson',
])

export interface DataFileDoc {
  content: string        // serialised JSON
  updatedAt: any         // Firestore Timestamp
  updatedBy: string      // user email
}

// ── Read ─────────────────────────────────────────────────

/**
 * Try to read a data file from Firestore.
 * Returns parsed JSON or null if the document doesn't exist.
 */
export async function readDataFile(filename: string): Promise<any | null> {
  if (STATIC_ONLY.has(filename)) return null
  try {
    const snap = await getDoc(doc(db, COLLECTION, filename))
    if (!snap.exists()) return null
    const data = snap.data() as DataFileDoc
    return JSON.parse(data.content)
  } catch {
    return null
  }
}

/**
 * Check if a Firestore override exists for a given filename.
 */
export async function hasFirestoreOverride(filename: string): Promise<boolean> {
  if (STATIC_ONLY.has(filename)) return false
  try {
    const snap = await getDoc(doc(db, COLLECTION, filename))
    return snap.exists()
  } catch {
    return false
  }
}

/**
 * List all filenames that have a Firestore override.
 */
export async function listFirestoreFiles(): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION))
    return snap.docs.map(d => d.id)
  } catch {
    return []
  }
}

// ── Write ────────────────────────────────────────────────

/**
 * Write a data file to Firestore.
 * Throws if the serialised JSON exceeds ~900 KB (safety margin for 1 MiB limit).
 */
export async function writeDataFile(filename: string, data: any): Promise<void> {
  if (STATIC_ONLY.has(filename)) {
    throw new Error(`${filename} est trop volumineux pour Firestore`)
  }

  const content = JSON.stringify(data)
  const sizeKB = new Blob([content]).size / 1024
  if (sizeKB > 900) {
    throw new Error(`${filename} (${Math.round(sizeKB)} KB) dépasse la limite Firestore de ~900 KB`)
  }

  await setDoc(doc(db, COLLECTION, filename), {
    content,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.email ?? 'unknown',
  } satisfies DataFileDoc)
}

/**
 * Delete a Firestore override for a data file.
 * After deletion, the app will fall back to the static version.
 */
export async function deleteDataFile(filename: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, filename))
}

/**
 * Check whether a filename is too large for Firestore.
 */
export function isStaticOnly(filename: string): boolean {
  return STATIC_ONLY.has(filename)
}

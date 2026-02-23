import { ref } from 'vue'
import type { Report } from '@/types/report'

// =============================================
// Report store — CRUD for block-based reports
// =============================================
// Reports are stored in Firestore collection `reports`.
// Each document: { ...Report, blocks serialized as JSON string }

const reports = ref<Report[]>([])
const loading = ref(false)

/** Fetch all reports (list view) */
export async function fetchReportList(): Promise<Report[]> {
  loading.value = true
  try {
    // Try Firestore
    try {
      const { collection, getDocs } = await import('firebase/firestore')
      const db = (await import('@/firebase')).db
      const snap = await getDocs(collection(db, 'reports'))
      const list: Report[] = []
      snap.forEach(doc => {
        const data = doc.data()
        list.push({
          id: doc.id,
          title: data.title ?? '',
          slug: data.slug ?? doc.id,
          description: data.description ?? '',
          blocks: typeof data.blocks === 'string' ? JSON.parse(data.blocks) : (data.blocks ?? []),
          createdAt: data.createdAt ?? '',
          updatedAt: data.updatedAt ?? '',
        })
      })
      reports.value = list
      return list
    } catch (e) {
      console.warn('[reports] Firestore unavailable, trying static', e)
    }

    // Fallback: try static file
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, '')
      const res = await fetch(`${base}/data/reports.json`)
      if (res.ok) {
        const data = await res.json()
        reports.value = Array.isArray(data) ? data : []
        return reports.value
      }
    } catch (e) {
      console.warn('[reports] static file not found', e)
    }

    reports.value = []
    return []
  } finally {
    loading.value = false
  }
}

/** Fetch a single report by slug */
export async function fetchReport(slug: string): Promise<Report | null> {
  // If already loaded, return from cache
  const cached = reports.value.find(r => r.slug === slug)
  if (cached) return cached

  // Otherwise fetch list and find
  await fetchReportList()
  return reports.value.find(r => r.slug === slug) ?? null
}

/** Save (create or update) a report to Firestore */
export async function saveReport(report: Report): Promise<void> {
  const { doc, setDoc } = await import('firebase/firestore')
  const { db } = await import('@/firebase')

  const docData = {
    title: report.title,
    slug: report.slug,
    description: report.description,
    blocks: JSON.stringify(report.blocks),
    createdAt: report.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await setDoc(doc(db, 'reports', report.id), docData)

  // Update local cache
  const idx = reports.value.findIndex(r => r.id === report.id)
  const updated = { ...report, updatedAt: docData.updatedAt, createdAt: docData.createdAt }
  if (idx >= 0) {
    reports.value[idx] = updated
  } else {
    reports.value.push(updated)
  }
}

/** Delete a report from Firestore */
export async function deleteReport(id: string): Promise<void> {
  const { doc, deleteDoc } = await import('firebase/firestore')
  const { db } = await import('@/firebase')

  await deleteDoc(doc(db, 'reports', id))
  reports.value = reports.value.filter(r => r.id !== id)
}

/** Generate a URL-safe slug from a title */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Generate a unique block ID */
export function newBlockId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export { reports, loading }

import type { LayerConfig } from '@/types/layer'

/**
 * Shared citation formatting for academic sources panel and About page.
 * Generates an HTML citation string from a layer's metadata.
 */
export function formatCitation(l: LayerConfig): string {
  const m = l.metadata
  if (!m) return 'Source non documentée.'
  let cite = ''
  if (m.authors?.length) {
    cite += m.authors.join(', ')
  } else {
    cite += m.source
  }
  if (m.year) cite += ` (${m.year})`
  cite += '. '
  if (m.title) cite += `<em>${m.title}</em>. `
  if (m.source && m.authors?.length) cite += `${m.source}. `
  if (m.license) cite += `[${m.license}] `
  if (m.accessDate) cite += `Consulté le ${m.accessDate}. `
  if (m.url) cite += `<a href="${m.url}" target="_blank" rel="noopener">${m.url}</a>`
  return cite
}

/**
 * Generate a BibTeX entry from a layer's metadata.
 */
export function toBibtex(l: LayerConfig): string {
  const m = l.metadata
  if (!m) return ''
  const key = l.id.replace(/[^a-zA-Z0-9]/g, '_')
  const authors = m.authors?.join(' and ') ?? m.source
  const lines = [
    `@misc{${key},`,
    `  author = {${authors}},`,
  ]
  if (m.title) lines.push(`  title = {${m.title}},`)
  if (m.year) lines.push(`  year = {${m.year}},`)
  if (m.url) lines.push(`  url = {${m.url}},`)
  if (m.accessDate) lines.push(`  note = {Consulté le ${m.accessDate}},`)
  lines.push('}')
  return lines.join('\n')
}

/**
 * Generate a full BibTeX file for all layers.
 */
export function generateBibtexFile(layers: LayerConfig[]): string {
  return layers
    .filter(l => l.metadata)
    .map(toBibtex)
    .join('\n\n')
}

/**
 * Normalize a commune name for fuzzy matching between GeoJSON and data files.
 * Handles: accents, apostrophes, hyphens, parenthetical notes, casing.
 *
 * "N'djili"           → "ndjili"
 * "Mont Ngafula"      → "mont ngafula"
 * "Mont-Ngafula"      → "mont ngafula"
 * "Maluku (Intérieur)"→ "maluku"
 * "Nsele"             → "nsele"
 * "N'sele"            → "nsele"
 */
export function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .toLowerCase()
    .replace(/\(.*?\)/g, '')           // remove parenthetical
    .replace(/[''`]/g, '')             // remove apostrophes
    .replace(/[-]/g, ' ')             // hyphens → spaces
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Format a number with French-style thousands separator.
 * 1678395 → "1 678 395"
 */
export function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('fr-FR')
}

/**
 * Get a color from a sequential palette given thresholds.
 * thresholds=[100k, 500k], colors=['#a','#b','#c']
 * value < 100k → '#a'   100k–500k → '#b'   ≥500k → '#c'
 */
export function getColor(value: number, thresholds: number[], colors: string[]): string {
  for (let i = 0; i < thresholds.length; i++) {
    if (value < thresholds[i]) return colors[i]
  }
  return colors[colors.length - 1]
}

/**
 * Format a threshold number for legend display.
 * 4000000 → "4M"   500000 → "500k"   1200 → "1.2k"
 */
export function formatThreshold(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    return v % 1 === 0 ? `${v}M` : `${v.toFixed(1)}M`
  }
  if (n >= 1_000) {
    const v = n / 1_000
    return v % 1 === 0 ? `${v}k` : `${v.toFixed(1)}k`
  }
  return String(n)
}

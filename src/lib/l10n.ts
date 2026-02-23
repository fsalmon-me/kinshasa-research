import type { Localizable } from '@/types/report'

/**
 * Resolve a Localizable value to a plain string for the given locale.
 * - If the value is a plain string, return it as-is (backward compatible).
 * - If the value is a { fr, en } object, return the matching locale (fallback: fr).
 */
export function resolveL10n(value: Localizable | undefined, locale: string): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  return (value as Record<string, string>)[locale] ?? value.fr ?? ''
}

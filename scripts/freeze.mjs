#!/usr/bin/env node
/**
 * freeze.mjs — Validate & freeze staged data files into public/data/
 *
 * Usage:
 *   node scripts/freeze.mjs              # Dry-run: show diff without copying
 *   node scripts/freeze.mjs --apply      # Copy validated files to public/data/
 *   node scripts/freeze.mjs --file foo   # Process only files matching "foo"
 *
 * Workflow:
 *   1. Place new/updated data files in data-staging/
 *   2. Run this script (dry-run first) to validate JSON / GeoJSON
 *   3. Run with --apply to copy validated files to public/data/
 *   4. Update data-manifest.json with new frozen date
 *   5. Commit
 */

import { readdir, readFile, copyFile, stat } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import { existsSync } from 'node:fs'

const STAGING_DIR = 'data-staging'
const TARGET_DIR  = 'public/data'
const MANIFEST    = join(TARGET_DIR, 'data-manifest.json')

const args = process.argv.slice(2)
const apply     = args.includes('--apply')
const fileFilter = args.includes('--file') ? args[args.indexOf('--file') + 1] : null

// ── Helpers ───────────────────────────────────────────────

function sizeLabel(bytes) {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateJSON(content, filename) {
  const errors = []
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (e) {
    errors.push(`Invalid JSON: ${e.message}`)
    return { parsed: null, errors }
  }

  const ext = extname(filename).toLowerCase()

  // GeoJSON validation
  if (ext === '.geojson') {
    if (parsed.type !== 'FeatureCollection') {
      errors.push(`Expected GeoJSON FeatureCollection, got type="${parsed.type}"`)
    }
    if (!Array.isArray(parsed.features)) {
      errors.push('Missing or invalid "features" array')
    } else {
      const noGeom = parsed.features.filter(f => !f.geometry).length
      if (noGeom > 0) errors.push(`${noGeom} feature(s) without geometry`)
    }
  }

  // JSON array validation (population.json, fuel-demand.json, etc.)
  if (ext === '.json' && Array.isArray(parsed)) {
    if (parsed.length === 0) {
      errors.push('Empty array')
    }
  }

  return { parsed, errors }
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  if (!existsSync(STAGING_DIR)) {
    console.log(`ℹ  No ${STAGING_DIR}/ directory found. Nothing to freeze.`)
    process.exit(0)
  }

  const entries = await readdir(STAGING_DIR)
  const dataFiles = entries.filter(f => {
    if (f.startsWith('.')) return false
    const ext = extname(f).toLowerCase()
    if (!['.json', '.geojson'].includes(ext)) return false
    if (fileFilter && !f.includes(fileFilter)) return false
    return true
  })

  if (dataFiles.length === 0) {
    console.log(`ℹ  No data files found in ${STAGING_DIR}/. Nothing to freeze.`)
    process.exit(0)
  }

  console.log(`\n🔍 Validating ${dataFiles.length} file(s) in ${STAGING_DIR}/\n`)

  // Load manifest for comparison
  let manifest = {}
  if (existsSync(MANIFEST)) {
    try {
      manifest = JSON.parse(await readFile(MANIFEST, 'utf-8')).files || {}
    } catch { /* ignore */ }
  }

  let valid = 0
  let invalid = 0
  const results = []

  for (const file of dataFiles) {
    const srcPath = join(STAGING_DIR, file)
    const dstPath = join(TARGET_DIR, file)
    const content = await readFile(srcPath, 'utf-8')
    const fileStat = await stat(srcPath)
    const { parsed, errors } = validateJSON(content, file)

    const exists = existsSync(dstPath)
    const status = exists ? 'UPDATE' : 'NEW'

    if (errors.length > 0) {
      invalid++
      console.log(`  ❌ ${file} — ${errors.join('; ')}`)
    } else {
      valid++
      const recordCount = Array.isArray(parsed)
        ? `${parsed.length} records`
        : parsed.features
          ? `${parsed.features.length} features`
          : 'object'

      console.log(`  ✅ ${file} [${status}] — ${sizeLabel(fileStat.size)}, ${recordCount}`)
      results.push({ file, srcPath, dstPath, status })
    }
  }

  console.log(`\n📊 ${valid} valid, ${invalid} invalid\n`)

  if (invalid > 0) {
    console.log('⚠️  Fix invalid files before freezing.')
    process.exit(1)
  }

  if (!apply) {
    console.log('ℹ  Dry-run complete. Use --apply to copy files to public/data/')
    process.exit(0)
  }

  // Copy files
  console.log('📦 Freezing files...\n')
  const today = new Date().toISOString().slice(0, 10)

  for (const { file, srcPath, dstPath, status } of results) {
    await copyFile(srcPath, dstPath)
    console.log(`  → ${file} [${status}] → ${dstPath}`)

    // Update manifest entry
    if (manifest[file]) {
      manifest[file].frozen = today
    }
  }

  // Write updated manifest
  if (existsSync(MANIFEST)) {
    try {
      const raw = JSON.parse(await readFile(MANIFEST, 'utf-8'))
      raw.files = { ...raw.files, ...manifest }
      await import('node:fs').then(fs =>
        fs.writeFileSync(MANIFEST, JSON.stringify(raw, null, 2) + '\n')
      )
      console.log(`\n📝 Updated ${MANIFEST} (frozen dates)`)
    } catch { /* ignore */ }
  }

  console.log(`\n✅ Frozen ${results.length} file(s). Don't forget to commit!`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})

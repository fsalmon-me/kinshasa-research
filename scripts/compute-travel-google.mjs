/**
 * Compute commune-to-commune travel time matrix using Google Distance Matrix API.
 *
 * Prerequisites:
 * - Create .env file with GOOGLE_MAPS_API_KEY=your_key
 * - Enable Distance Matrix API in Google Cloud Console
 *
 * IMPORTANT: Google limits server-side requests to 100 elements max per call.
 * 24×24 = 576 elements → batched into 10×10 chunks (6-7 API calls).
 *
 * Cost: 576 elements × $5/1000 = ~$2.88 per full run
 * Budget: tracked in data/google-api-usage.json — refuses to run if monthly spend > $180
 *
 * Usage:
 *   node scripts/compute-travel-google.mjs --dry-run        # preview batching plan
 *   node scripts/compute-travel-google.mjs --confirm         # run with current traffic
 *   node scripts/compute-travel-google.mjs --confirm --morning   # typical weekday 8am
 *   node scripts/compute-travel-google.mjs --confirm --evening   # typical weekday 5pm
 *
 * Output: public/data/travel-google.json (or travel-google-morning.json etc.)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const centroid = require('@turf/centroid').default;

const COMMUNES_FILE = 'public/data/communes.geojson';
const OSRM_SNAPPED_FILE = 'public/data/travel-osrm.json';
const BUDGET_FILE = 'public/data/google-api-usage.json';

const BATCH_SIZE = 10;  // max origins or destinations per batch (10×10 = 100 elements ≤ Google limit)
const COST_PER_1000 = 5.0; // USD per 1000 elements (basic SKU)
const MONTHLY_BUDGET_LIMIT = 180; // USD — refuse to run if we'd exceed this
const BATCH_DELAY_MS = 600; // delay between API calls to respect rate limits

const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRMED = process.argv.includes('--confirm');
const MORNING = process.argv.includes('--morning');
const EVENING = process.argv.includes('--evening');

function loadApiKey() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    throw new Error('Missing .env file. Create it with:\n  GOOGLE_MAPS_API_KEY=your_key_here\n\nSee .env.example');
  }
  const env = readFileSync(envPath, 'utf8');
  const match = env.match(/GOOGLE_MAPS_API_KEY=(.+)/);
  if (!match) {
    throw new Error('GOOGLE_MAPS_API_KEY not found in .env');
  }
  return match[1].trim();
}

/** Load or initialize budget tracker */
function loadBudget() {
  const path = resolve(process.cwd(), BUDGET_FILE);
  if (!existsSync(path)) return { runs: [] };
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Save budget tracker */
function saveBudget(budget) {
  const path = resolve(process.cwd(), BUDGET_FILE);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(budget, null, 2), 'utf8');
}

/** Get total cost for the current month */
function monthlySpend(budget) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return budget.runs
    .filter(r => r.date.startsWith(monthKey))
    .reduce((sum, r) => sum + r.cost, 0);
}

/** Get departure_time for traffic-aware routing */
function getDepartureTime() {
  if (MORNING) {
    // Next weekday at 8:00 local (Kinshasa = UTC+1)
    const d = getNextWeekday();
    d.setUTCHours(7, 0, 0, 0); // 8:00 CAT = 7:00 UTC
    return Math.floor(d.getTime() / 1000);
  }
  if (EVENING) {
    const d = getNextWeekday();
    d.setUTCHours(16, 0, 0, 0); // 17:00 CAT = 16:00 UTC
    return Math.floor(d.getTime() / 1000);
  }
  return 'now';
}

function getNextWeekday() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('🗺️  Google Distance Matrix Calculator (batched)\n');

  // Load commune centroids — prefer snapped points from OSRM if available
  let points;
  const osrmPath = resolve(process.cwd(), OSRM_SNAPPED_FILE);

  if (existsSync(osrmPath)) {
    console.log('✓ Using snapped centroids from OSRM computation');
    const osrmData = JSON.parse(readFileSync(osrmPath, 'utf8'));
    points = osrmData.metadata.snappingDetails.map(d => ({
      name: d.commune,
      lat: d.snapped[1],
      lng: d.snapped[0],
    }));
  } else {
    console.log('⚠ No OSRM data found — computing centroids from GeoJSON');
    const geojson = JSON.parse(readFileSync(resolve(process.cwd(), COMMUNES_FILE), 'utf8'));
    points = geojson.features.map(f => {
      const c = centroid(f);
      return {
        name: f.properties.name,
        lat: c.geometry.coordinates[1],
        lng: c.geometry.coordinates[0],
      };
    });
  }

  const n = points.length;
  const elements = n * n;
  const cost = (elements / 1000) * COST_PER_1000;

  // Calculate batching plan
  const originBatches = [];
  for (let i = 0; i < n; i += BATCH_SIZE) originBatches.push({ start: i, end: Math.min(i + BATCH_SIZE, n) });
  const destBatches = [];
  for (let j = 0; j < n; j += BATCH_SIZE) destBatches.push({ start: j, end: Math.min(j + BATCH_SIZE, n) });
  const totalBatches = originBatches.length * destBatches.length;

  const mode = MORNING ? 'morning rush (8h)' : EVENING ? 'evening rush (17h)' : 'current traffic';
  const suffix = MORNING ? '-morning' : EVENING ? '-evening' : '';
  const outputFile = `public/data/travel-google${suffix}.json`;

  console.log(`   ${n} communes → ${elements} elements`);
  console.log(`   Batch size: ${BATCH_SIZE}×${BATCH_SIZE} = ${BATCH_SIZE * BATCH_SIZE} elements/call`);
  console.log(`   Total batches: ${totalBatches} API calls`);
  console.log(`   Estimated cost: $${cost.toFixed(2)}`);
  console.log(`   Mode: ${mode}`);
  console.log(`   Output: ${outputFile}\n`);

  // Budget check
  const budget = loadBudget();
  const spent = monthlySpend(budget);
  const projectedSpend = spent + cost;
  console.log(`💰 Monthly spend so far: $${spent.toFixed(2)}`);
  console.log(`   Projected after this run: $${projectedSpend.toFixed(2)} / $${MONTHLY_BUDGET_LIMIT}\n`);

  if (projectedSpend > MONTHLY_BUDGET_LIMIT) {
    console.error(`❌ BUDGET LIMIT: This run would bring monthly spend to $${projectedSpend.toFixed(2)}, exceeding the $${MONTHLY_BUDGET_LIMIT} limit.`);
    console.error(`   Current month spend: $${spent.toFixed(2)}`);
    console.error(`   This run would cost: $${cost.toFixed(2)}`);
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('[dry-run] Batching plan:');
    let batchNum = 0;
    for (const ob of originBatches) {
      for (const db of destBatches) {
        batchNum++;
        const batchElements = (ob.end - ob.start) * (db.end - db.start);
        console.log(`   Batch ${batchNum}: origins [${ob.start}-${ob.end - 1}] × dests [${db.start}-${db.end - 1}] = ${batchElements} elements`);
      }
    }
    console.log(`\nPoints:`);
    points.forEach(p => console.log(`   ${p.name}: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`));
    return;
  }

  if (!CONFIRMED) {
    console.log('⚠ Add --confirm flag to execute (cost safeguard).');
    console.log('  node scripts/compute-travel-google.mjs --confirm');
    console.log('  node scripts/compute-travel-google.mjs --confirm --morning');
    console.log('  node scripts/compute-travel-google.mjs --confirm --evening');
    return;
  }

  const apiKey = loadApiKey();
  console.log('🔑 API key loaded\n');

  const departureTime = getDepartureTime();

  // Initialize result matrices
  const durations = Array.from({ length: n }, () => Array(n).fill(null));
  const distances = Array.from({ length: n }, () => Array(n).fill(null));

  let batchNum = 0;
  let totalElementsQueried = 0;

  for (const ob of originBatches) {
    for (const db of destBatches) {
      batchNum++;
      const batchOrigins = points.slice(ob.start, ob.end);
      const batchDests = points.slice(db.start, db.end);
      const batchElements = batchOrigins.length * batchDests.length;
      totalElementsQueried += batchElements;

      console.log(`🔄 Batch ${batchNum}/${totalBatches}: ${batchOrigins.length} origins × ${batchDests.length} dests = ${batchElements} elements`);

      const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
      url.searchParams.set('origins', batchOrigins.map(p => `${p.lat},${p.lng}`).join('|'));
      url.searchParams.set('destinations', batchDests.map(p => `${p.lat},${p.lng}`).join('|'));
      url.searchParams.set('mode', 'driving');
      url.searchParams.set('language', 'fr');
      url.searchParams.set('departure_time', String(departureTime));
      url.searchParams.set('key', apiKey);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (data.status !== 'OK') {
        throw new Error(`Google API error on batch ${batchNum}: ${data.status} — ${data.error_message || ''}`);
      }

      // Fill result matrices at correct positions
      for (let i = 0; i < batchOrigins.length; i++) {
        for (let j = 0; j < batchDests.length; j++) {
          const element = data.rows[i].elements[j];
          const globalI = ob.start + i;
          const globalJ = db.start + j;

          if (element.status === 'OK') {
            // Prefer duration_in_traffic if available
            const dur = element.duration_in_traffic?.value ?? element.duration.value;
            durations[globalI][globalJ] = Math.round(dur / 60);
            distances[globalI][globalJ] = +(element.distance.value / 1000).toFixed(1);
          }
        }
      }

      console.log(`   ✓ done`);

      // Delay between batches to respect rate limits
      if (batchNum < totalBatches) {
        await sleep(BATCH_DELAY_MS);
      }
    }
  }

  // Save result
  const result = {
    metadata: {
      source: 'Google Distance Matrix API',
      computedAt: new Date().toISOString(),
      mode: MORNING ? 'morning_rush' : EVENING ? 'evening_rush' : 'realtime',
      departureTime: typeof departureTime === 'number' ? new Date(departureTime * 1000).toISOString() : 'now',
      methodology: `Points de référence : centroïdes des communes accrochés aux routes via OSRM /nearest. Matrice calculée via Google Distance Matrix API (mode: driving, departure_time: ${mode}). Batchée en ${totalBatches} requêtes de max ${BATCH_SIZE}×${BATCH_SIZE} éléments. Les temps incluent les données de trafic réel de Google.`,
      units: { durations: 'minutes', distances: 'km' },
      apiVersion: 'v1',
      batchSize: BATCH_SIZE,
      totalBatches,
      totalElements: totalElementsQueried,
      cost: `$${cost.toFixed(2)}`,
      notes: 'duration_in_traffic utilisé quand disponible. Les résultats peuvent varier selon l\'heure et le jour de la semaine.',
    },
    communes: points.map(p => p.name),
    durations,
    distances,
  };

  const outPath = resolve(process.cwd(), outputFile);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

  // Update budget tracker
  budget.runs.push({
    date: new Date().toISOString(),
    elements: totalElementsQueried,
    cost,
    mode: result.metadata.mode,
    output: outputFile,
  });
  saveBudget(budget);

  console.log(`\n✅ Saved to ${outputFile}`);

  // Summary
  const allD = durations.flat().filter(v => v != null && v > 0);
  const avg = allD.reduce((a, b) => a + b, 0) / allD.length;
  const max = Math.max(...allD);
  console.log(`   Avg travel time: ${avg.toFixed(0)} min`);
  console.log(`   Max travel time: ${max} min`);
  console.log(`\n💰 Budget updated: $${monthlySpend(budget).toFixed(2)} spent this month`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

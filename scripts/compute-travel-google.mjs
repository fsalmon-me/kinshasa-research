/**
 * Compute commune-to-commune travel time matrix using Google Distance Matrix API.
 *
 * Prerequisites:
 * - Create .env file with GOOGLE_MAPS_API_KEY=your_key
 * - Enable Distance Matrix API in Google Cloud Console
 *
 * Cost: 24×24 = 576 elements = ~$2.88 (within $200/month free tier)
 *
 * Usage: node scripts/compute-travel-google.mjs
 *        node scripts/compute-travel-google.mjs --dry-run
 *        node scripts/compute-travel-google.mjs --confirm
 *
 * The --confirm flag is REQUIRED for actual API calls (cost safeguard).
 *
 * Output: public/data/travel-google.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const centroid = require('@turf/centroid').default;

const COMMUNES_FILE = 'public/data/communes.geojson';
const OSRM_SNAPPED_FILE = 'public/data/travel-osrm.json';
const OUTPUT_FILE = 'public/data/travel-google.json';

const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRMED = process.argv.includes('--confirm');

function loadApiKey() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    throw new Error('Missing .env file. Create it with:\n  GOOGLE_MAPS_API_KEY=your_key_here');
  }
  const env = readFileSync(envPath, 'utf8');
  const match = env.match(/GOOGLE_MAPS_API_KEY=(.+)/);
  if (!match) {
    throw new Error('GOOGLE_MAPS_API_KEY not found in .env');
  }
  return match[1].trim();
}

async function main() {
  console.log('🗺️  Google Distance Matrix Calculator\n');

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
  const cost = (elements / 1000) * 5.0;

  console.log(`   ${n} communes → ${elements} elements`);
  console.log(`   Estimated cost: $${cost.toFixed(2)} (within $200/month free tier)\n`);

  if (DRY_RUN) {
    console.log('[dry-run] Would call Google Distance Matrix API. Points:');
    points.forEach(p => console.log(`   ${p.name}: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`));
    return;
  }

  if (!CONFIRMED) {
    console.log('⚠ Add --confirm flag to execute (cost safeguard).');
    console.log('  node scripts/compute-travel-google.mjs --confirm');
    return;
  }

  const apiKey = loadApiKey();
  console.log('🔑 API key loaded\n');

  // Build origins/destinations strings
  // Google accepts max 25 origins × 25 destinations — 24×24 fits in one call
  const origins = points.map(p => `${p.lat},${p.lng}`).join('|');
  const destinations = origins;

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins', origins);
  url.searchParams.set('destinations', destinations);
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('language', 'fr');
  url.searchParams.set('key', apiKey);

  console.log('🔄 Calling Google Distance Matrix API...');
  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== 'OK') {
    throw new Error(`Google API error: ${data.status} — ${data.error_message || ''}`);
  }

  // Parse response
  const durations = [];
  const distances = [];

  for (let i = 0; i < n; i++) {
    const dRow = [];
    const distRow = [];
    for (let j = 0; j < n; j++) {
      const element = data.rows[i].elements[j];
      if (element.status === 'OK') {
        dRow.push(Math.round(element.duration.value / 60)); // minutes
        distRow.push(+(element.distance.value / 1000).toFixed(1)); // km
      } else {
        dRow.push(null);
        distRow.push(null);
      }
    }
    durations.push(dRow);
    distances.push(distRow);
  }

  const result = {
    metadata: {
      source: 'Google Distance Matrix API',
      computedAt: new Date().toISOString(),
      methodology: 'Points de référence : centroïdes des communes accrochés aux routes via OSRM /nearest. Matrice calculée via Google Distance Matrix API (mode: driving). Les temps incluent les conditions de circulation moyennes.',
      units: { durations: 'minutes', distances: 'km' },
      apiVersion: 'v1',
      mode: 'driving',
      notes: 'Les temps de trajet incluent les estimations de trafic moyen de Google. Les résultats peuvent différer de l\'OSRM en raison des données de trafic et de la couverture routière différente.',
    },
    communes: points.map(p => p.name),
    durations,
    distances,
  };

  const outPath = resolve(process.cwd(), OUTPUT_FILE);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

  console.log(`\n✅ Saved to ${OUTPUT_FILE}`);

  // Summary
  const allD = durations.flat().filter(v => v != null && v > 0);
  const avg = allD.reduce((a, b) => a + b, 0) / allD.length;
  const max = Math.max(...allD);
  console.log(`   Avg travel time: ${avg.toFixed(0)} min`);
  console.log(`   Max travel time: ${max} min`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

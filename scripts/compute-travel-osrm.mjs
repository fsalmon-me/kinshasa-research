/**
 * Compute commune-to-commune travel time matrix using OSRM (free, OSM-based).
 *
 * Steps:
 * 1. Load communes.geojson
 * 2. Compute centroid of each commune polygon
 * 3. Snap each centroid to the nearest road using OSRM /nearest
 * 4. Compute full 24×24 travel time matrix using OSRM /table
 * 5. Save result as public/data/travel-osrm.json
 *
 * The OSRM demo server (router.project-osrm.org) is used.
 * For production, consider self-hosting with DRC OSM extract.
 *
 * Usage: node scripts/compute-travel-osrm.mjs
 *        node scripts/compute-travel-osrm.mjs --dry-run
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const centroid = require('@turf/centroid').default;

const COMMUNES_FILE = 'public/data/communes.geojson';
const OUTPUT_FILE = 'public/data/travel-osrm.json';
const OSRM_BASE = 'https://router.project-osrm.org';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('🚗 OSRM Travel Time Matrix Calculator\n');

  // 1. Load communes
  const geojsonPath = resolve(process.cwd(), COMMUNES_FILE);
  const geojson = JSON.parse(readFileSync(geojsonPath, 'utf8'));
  const communes = geojson.features;
  console.log(`✓ Loaded ${communes.length} communes from ${COMMUNES_FILE}`);

  // 2. Compute centroids
  const points = [];
  for (const feature of communes) {
    const name = feature.properties.name;
    const c = centroid(feature);
    const [lng, lat] = c.geometry.coordinates;
    points.push({ name, lng, lat, snappedLng: lng, snappedLat: lat });
  }

  console.log(`✓ Computed ${points.length} centroids\n`);

  // 3. Snap to nearest road via OSRM
  console.log('📍 Snapping centroids to nearest roads...');
  for (const p of points) {
    if (DRY_RUN) {
      console.log(`   [dry-run] ${p.name}: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`);
      continue;
    }

    const url = `${OSRM_BASE}/nearest/v1/driving/${p.lng},${p.lat}?number=1`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.waypoints?.length) {
        const wp = data.waypoints[0];
        p.snappedLng = wp.location[0];
        p.snappedLat = wp.location[1];
        const dist = haversine(p.lat, p.lng, wp.location[1], wp.location[0]);
        console.log(`   ✓ ${p.name}: snapped ${dist.toFixed(0)}m to road "${wp.name || 'unnamed'}"`);
      } else {
        console.log(`   ⚠ ${p.name}: could not snap (${data.code})`);
      }
    } catch (err) {
      console.log(`   ⚠ ${p.name}: network error — using raw centroid`);
    }

    // Rate limit
    await sleep(500);
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] Would compute 24×24 matrix. Exiting.');
    return;
  }

  // 4. Compute travel time matrix
  console.log('\n🔄 Computing travel time matrix...');
  const coords = points.map(p => `${p.snappedLng},${p.snappedLat}`).join(';');
  const tableUrl = `${OSRM_BASE}/table/v1/driving/${coords}?annotations=duration,distance`;

  const tableRes = await fetch(tableUrl);
  const tableData = await tableRes.json();

  if (tableData.code !== 'Ok') {
    throw new Error(`OSRM table error: ${tableData.code} — ${tableData.message || ''}`);
  }

  // Convert durations from seconds to minutes, distances from meters to km
  const durations = tableData.durations.map(row =>
    row.map(v => v != null ? Math.round(v / 60) : null)
  );
  const distances = tableData.distances.map(row =>
    row.map(v => v != null ? +(v / 1000).toFixed(1) : null)
  );

  // 5. Build output
  const result = {
    metadata: {
      source: 'OSRM (Open Source Routing Machine)',
      dataSource: 'OpenStreetMap',
      computedAt: new Date().toISOString(),
      methodology: 'Centroid de chaque commune calculé avec @turf/centroid, puis accroché à la route la plus proche via OSRM /nearest. Matrice 24×24 calculée via OSRM /table (mode: driving, sans trafic temps réel).',
      units: { durations: 'minutes', distances: 'km' },
      snappingDetails: points.map(p => ({
        commune: p.name,
        centroid: [p.lng, p.lat],
        snapped: [p.snappedLng, p.snappedLat],
        offsetMeters: Math.round(haversine(p.lat, p.lng, p.snappedLat, p.snappedLng)),
      })),
      notes: 'Les temps de trajet sont estimés sans embouteillages. La couverture routière OSM à Kinshasa peut être incomplète, ce qui peut allonger certains itinéraires.',
    },
    communes: points.map(p => p.name),
    durations,
    distances,
  };

  const outPath = resolve(process.cwd(), OUTPUT_FILE);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

  console.log(`\n✅ Saved to ${OUTPUT_FILE}`);
  console.log(`   ${points.length}×${points.length} matrix`);

  // Print summary
  const allDurations = durations.flat().filter(v => v != null && v > 0);
  const avg = allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
  const max = Math.max(...allDurations);
  console.log(`   Avg travel time: ${avg.toFixed(0)} min`);
  console.log(`   Max travel time: ${max} min`);
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

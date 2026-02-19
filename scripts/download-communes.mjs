/**
 * Script to download Kinshasa commune boundaries from OpenStreetMap (Overpass API)
 * and save them as a GeoJSON file.
 * 
 * The communes of Kinshasa are at admin_level=7 in OSM.
 * 
 * Usage: node scripts/download-communes.mjs
 */

const OUTPUT_FILE = 'public/data/communes.geojson';

// Overpass query: get all admin_level=7 boundaries within Kinshasa (admin_level=4)
// Output as JSON with full geometry
const OVERPASS_QUERY = `
[out:json][timeout:120];
area[name="Kinshasa"][admin_level=4]->.searchArea;
relation[admin_level=7](area.searchArea);
out body;
>;
out skel qt;
`;

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

async function main() {
  console.log('📡 Downloading commune boundaries from OpenStreetMap...');
  console.log('   Query: admin_level=7 within Kinshasa\n');

  const url = `${OVERPASS_URL}?data=${encodeURIComponent(OVERPASS_QUERY)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }
  
  const osmData = await response.json();
  console.log(`✓ Received ${osmData.elements.length} OSM elements`);

  // Separate elements by type
  const nodes = new Map();
  const ways = new Map();
  const relations = [];

  for (const el of osmData.elements) {
    if (el.type === 'node') {
      nodes.set(el.id, [el.lon, el.lat]);
    } else if (el.type === 'way') {
      ways.set(el.id, el.nodes || []);
    } else if (el.type === 'relation') {
      relations.push(el);
    }
  }

  console.log(`   ${nodes.size} nodes, ${ways.size} ways, ${relations.length} relations`);

  // Convert each relation to a GeoJSON feature
  const features = [];

  for (const rel of relations) {
    const name = rel.tags?.name || 'Unknown';
    console.log(`   Processing: ${name} (relation/${rel.id})`);

    // Get outer members (ways that form the boundary)
    const outerWays = rel.members
      .filter(m => m.type === 'way' && (m.role === 'outer' || m.role === ''))
      .map(m => m.ref);

    // Build rings from ways
    const rings = buildRings(outerWays, ways, nodes);
    
    if (rings.length === 0) {
      console.warn(`   ⚠ Could not build polygon for ${name}`);
      continue;
    }

    // Create GeoJSON feature
    const geometry = rings.length === 1
      ? { type: 'Polygon', coordinates: rings }
      : { type: 'MultiPolygon', coordinates: rings.map(r => [r]) };

    features.push({
      type: 'Feature',
      properties: {
        name: name,
        osm_id: rel.id,
        wikidata: rel.tags?.wikidata || null,
        wikipedia: rel.tags?.wikipedia || null,
      },
      geometry,
    });
  }

  console.log(`\n✓ ${features.length} communes extracted`);

  // Build FeatureCollection
  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      source: 'OpenStreetMap via Overpass API',
      date: new Date().toISOString(),
      description: 'Communes of Kinshasa, DRC (admin_level=7)',
      license: 'ODbL - https://opendatacommons.org/licenses/odbl/',
    },
    features,
  };

  // Write file
  const fs = await import('fs');
  const path = await import('path');
  const outPath = path.resolve(process.cwd(), OUTPUT_FILE);
  
  // Ensure directory exists
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2), 'utf-8');

  console.log(`\n✅ Saved to ${OUTPUT_FILE}`);
  console.log(`   File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
  console.log('\nCommunes:');
  features.forEach(f => console.log(`   - ${f.properties.name}`));
}

/**
 * Build closed rings from a list of way IDs.
 * Ways may need to be joined end-to-end and/or reversed.
 */
function buildRings(wayIds, ways, nodes) {
  // Get coordinate arrays for each way
  const wayCoords = wayIds.map(id => {
    const nodeIds = ways.get(id) || [];
    return nodeIds.map(nid => nodes.get(nid)).filter(Boolean);
  }).filter(coords => coords.length > 0);

  if (wayCoords.length === 0) return [];

  const rings = [];
  const used = new Set();

  while (used.size < wayCoords.length) {
    // Start a new ring with the first unused way
    let ringCoords = null;
    for (let i = 0; i < wayCoords.length; i++) {
      if (!used.has(i)) {
        ringCoords = [...wayCoords[i]];
        used.add(i);
        break;
      }
    }

    if (!ringCoords) break;

    // Try to close the ring by joining more ways
    let changed = true;
    while (changed) {
      changed = false;
      const last = ringCoords[ringCoords.length - 1];
      const first = ringCoords[0];

      // Check if ring is already closed
      if (last[0] === first[0] && last[1] === first[1] && ringCoords.length > 3) {
        break;
      }

      for (let i = 0; i < wayCoords.length; i++) {
        if (used.has(i)) continue;
        const wc = wayCoords[i];
        const wFirst = wc[0];
        const wLast = wc[wc.length - 1];

        // Try to append
        if (coordsEqual(last, wFirst)) {
          ringCoords.push(...wc.slice(1));
          used.add(i);
          changed = true;
        } else if (coordsEqual(last, wLast)) {
          ringCoords.push(...[...wc].reverse().slice(1));
          used.add(i);
          changed = true;
        } else if (coordsEqual(first, wLast)) {
          ringCoords = [...wc.slice(0, -1), ...ringCoords];
          used.add(i);
          changed = true;
        } else if (coordsEqual(first, wFirst)) {
          ringCoords = [...[...wc].reverse().slice(0, -1), ...ringCoords];
          used.add(i);
          changed = true;
        }
      }
    }

    // Close ring if not already closed
    const f = ringCoords[0];
    const l = ringCoords[ringCoords.length - 1];
    if (!coordsEqual(f, l)) {
      ringCoords.push(f);
    }

    if (ringCoords.length >= 4) {
      rings.push(ringCoords);
    }
  }

  return rings;
}

function coordsEqual(a, b) {
  return a && b && Math.abs(a[0] - b[0]) < 1e-8 && Math.abs(a[1] - b[1]) < 1e-8;
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

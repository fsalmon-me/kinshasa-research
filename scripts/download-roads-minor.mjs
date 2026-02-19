/**
 * Download minor roads (tertiary, residential, unclassified) from OSM.
 * These are separated from major roads to allow independent toggling
 * and avoid large single-file payloads.
 *
 * Usage: node scripts/download-roads-minor.mjs
 */

const OUTPUT_FILE = 'public/data/roads-minor.geojson';

const OVERPASS_QUERY = `
[out:json][timeout:180];
area[name="Kinshasa"][admin_level=4]->.searchArea;
(
  way["highway"~"^(tertiary|residential|unclassified)$"](area.searchArea);
);
out body;
>;
out skel qt;
`;

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

async function main() {
  console.log('📡 Downloading minor road network from OpenStreetMap...');
  console.log('   Types: tertiary, residential, unclassified\n');

  const url = `${OVERPASS_URL}?data=${encodeURIComponent(OVERPASS_QUERY)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  const osmData = await response.json();
  console.log(`✓ Received ${osmData.elements.length} OSM elements`);

  // Separate nodes and ways
  const nodes = new Map();
  const wayElements = [];

  for (const el of osmData.elements) {
    if (el.type === 'node') {
      nodes.set(el.id, [el.lon, el.lat]);
    } else if (el.type === 'way') {
      wayElements.push(el);
    }
  }

  console.log(`   ${nodes.size} nodes, ${wayElements.length} ways`);

  const typeCounts = {};
  const features = [];

  for (const way of wayElements) {
    const coords = (way.nodes || [])
      .map(nid => nodes.get(nid))
      .filter(Boolean);

    if (coords.length < 2) continue;

    const highway = way.tags?.highway || 'unknown';
    typeCounts[highway] = (typeCounts[highway] || 0) + 1;

    features.push({
      type: 'Feature',
      properties: {
        name: way.tags?.name || null,
        highway,
        ref: way.tags?.ref || null,
        surface: way.tags?.surface || null,
        lanes: way.tags?.lanes ? parseInt(way.tags.lanes) : null,
        oneway: way.tags?.oneway === 'yes',
        osm_id: way.id,
      },
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
    });
  }

  console.log('\nRoad types:');
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${type}: ${count} segments`);
  }

  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      source: 'OpenStreetMap via Overpass API',
      date: new Date().toISOString(),
      description: 'Minor roads of Kinshasa, DRC (tertiary, residential, unclassified)',
      license: 'ODbL - https://opendatacommons.org/licenses/odbl/',
    },
    features,
  };

  const fs = await import('fs');
  const path = await import('path');
  const outPath = path.resolve(process.cwd(), OUTPUT_FILE);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2), 'utf-8');

  console.log(`\n✅ Saved to ${OUTPUT_FILE}`);
  console.log(`   ${features.length} road segments`);
  console.log(`   File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

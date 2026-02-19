/**
 * Script to download the road network of Kinshasa from OpenStreetMap (Overpass API).
 * Downloads primary, secondary, and trunk roads as GeoJSON LineStrings.
 * 
 * Usage: node scripts/download-roads.mjs
 */

const OUTPUT_FILE = 'public/data/roads.geojson';

// Overpass query: get major roads within Kinshasa
// highway=motorway|trunk|primary|secondary
const OVERPASS_QUERY = `
[out:json][timeout:120];
area[name="Kinshasa"][admin_level=4]->.searchArea;
(
  way["highway"~"^(motorway|trunk|primary|secondary)$"](area.searchArea);
);
out body;
>;
out skel qt;
`;

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

async function main() {
  console.log('📡 Downloading road network from OpenStreetMap...');
  console.log('   Types: motorway, trunk, primary, secondary\n');

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

  // Count by type
  const typeCounts = {};

  // Convert ways to GeoJSON features
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
        highway: highway,
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

  // Build FeatureCollection
  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      source: 'OpenStreetMap via Overpass API',
      date: new Date().toISOString(),
      description: 'Major roads of Kinshasa, DRC (motorway, trunk, primary, secondary)',
      license: 'ODbL - https://opendatacommons.org/licenses/odbl/',
    },
    features,
  };

  // Write file
  const fs = await import('fs');
  const path = await import('path');
  const outPath = path.resolve(process.cwd(), OUTPUT_FILE);
  
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2), 'utf-8');

  console.log(`\n✅ Saved to ${OUTPUT_FILE}`);
  console.log(`   ${features.length} road segments`);
  console.log(`   File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);

  // Show some named roads
  const namedRoads = [...new Set(features.filter(f => f.properties.name).map(f => f.properties.name))].sort();
  console.log(`\nNamed roads (${namedRoads.length}):`);
  namedRoads.slice(0, 30).forEach(n => console.log(`   - ${n}`));
  if (namedRoads.length > 30) console.log(`   ... and ${namedRoads.length - 30} more`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

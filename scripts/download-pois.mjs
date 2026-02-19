/**
 * Download POI data from OpenStreetMap Overpass API for Kinshasa.
 * Outputs individual GeoJSON files per POI category.
 * 
 * All POIs are converted to Point geometry (using centroid for ways/relations).
 *
 * Usage: node scripts/download-pois.mjs
 *        node scripts/download-pois.mjs --only hospitals,schools
 */

const POI_CONFIGS = [
  {
    id: 'hospitals',
    label: 'Hôpitaux & Cliniques',
    query: `node["amenity"~"^(hospital|clinic)$"];way["amenity"~"^(hospital|clinic)$"];`,
    file: 'hospitals.geojson',
    extraProps: ['healthcare', 'operator', 'beds', 'phone', 'website', 'addr:city'],
  },
  {
    id: 'schools',
    label: 'Écoles',
    query: `node["amenity"="school"];way["amenity"="school"];`,
    file: 'schools.geojson',
    extraProps: ['operator', 'isced:level', 'religion', 'phone', 'website'],
  },
  {
    id: 'fuel',
    label: 'Stations-service',
    query: `node["amenity"="fuel"];way["amenity"="fuel"];`,
    file: 'fuel.geojson',
    extraProps: ['brand', 'operator', 'fuel:diesel', 'fuel:octane_95', 'opening_hours'],
  },
  {
    id: 'markets',
    label: 'Marchés',
    query: `node["amenity"="marketplace"];way["amenity"="marketplace"];`,
    file: 'markets.geojson',
    extraProps: ['opening_hours', 'operator', 'shop'],
  },
  {
    id: 'banks',
    label: 'Banques',
    query: `node["amenity"="bank"];way["amenity"="bank"];`,
    file: 'banks.geojson',
    extraProps: ['brand', 'operator', 'atm', 'phone', 'opening_hours', 'website'],
  },
  {
    id: 'embassies',
    label: 'Ambassades & Consulats',
    query: `node["office"="diplomatic"];way["office"="diplomatic"];node["amenity"="embassy"];way["amenity"="embassy"];`,
    file: 'embassies.geojson',
    extraProps: ['country', 'target', 'diplomatic', 'phone', 'website'],
  },
];

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function buildQuery(poiQuery) {
  return `
[out:json][timeout:90];
area[name="Kinshasa"][admin_level=4]->.searchArea;
(
  ${poiQuery.replace(/;/g, '(area.searchArea);\n  ').replace(/;\s*$/, '(area.searchArea);')}
);
out body center;
`;
}

function elementToFeature(el, extraProps) {
  let lat, lng;
  if (el.type === 'node') {
    lat = el.lat;
    lng = el.lon;
  } else if (el.center) {
    lat = el.center.lat;
    lng = el.center.lon;
  } else {
    return null;
  }

  if (!lat || !lng) return null;

  const tags = el.tags || {};
  const props = {
    name: tags.name || tags['name:fr'] || null,
    amenity: tags.amenity || tags.office || null,
    osm_id: el.id,
    osm_type: el.type,
  };

  for (const key of extraProps) {
    if (tags[key] != null) props[key] = tags[key];
  }

  return {
    type: 'Feature',
    properties: props,
    geometry: {
      type: 'Point',
      coordinates: [lng, lat],
    },
  };
}

async function downloadPOI(config) {
  const query = buildQuery(config.query);
  console.log(`📡 Downloading ${config.label}...`);

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error for ${config.id}: ${response.status}`);
  }

  const osmData = await response.json();
  const features = osmData.elements
    .map(el => elementToFeature(el, config.extraProps))
    .filter(Boolean);

  console.log(`   ✓ ${features.length} features`);

  return {
    type: 'FeatureCollection',
    metadata: {
      source: 'OpenStreetMap via Overpass API',
      date: new Date().toISOString(),
      description: `${config.label} in Kinshasa, DRC`,
      license: 'ODbL - https://opendatacommons.org/licenses/odbl/',
      featureCount: features.length,
    },
    features,
  };
}

async function main() {
  const fs = await import('fs');
  const path = await import('path');

  // Parse --only flag
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const onlyFilter = onlyArg ? onlyArg.split('=')[1].split(',') : null;
  const configs = onlyFilter
    ? POI_CONFIGS.filter(c => onlyFilter.includes(c.id))
    : POI_CONFIGS;

  console.log(`\n🏙️  Kinshasa POI Downloader`);
  console.log(`   Categories: ${configs.map(c => c.id).join(', ')}\n`);

  const summary = [];

  for (const config of configs) {
    try {
      const geojson = await downloadPOI(config);
      const outPath = path.resolve(process.cwd(), 'public/data', config.file);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2), 'utf-8');
      const size = (fs.statSync(outPath).size / 1024).toFixed(1);
      summary.push({ id: config.id, count: geojson.features.length, size });

      // Wait 2s between requests to be polite to Overpass API
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`   ❌ ${config.id}: ${err.message}`);
      summary.push({ id: config.id, count: 0, size: '0' });
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Summary:');
  for (const s of summary) {
    console.log(`   ${s.id.padEnd(15)} ${String(s.count).padStart(5)} features  ${s.size} KB`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

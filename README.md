# Kinshasa Research Map

Carte interactive de recherche sur la ville de Kinshasa (RDC) — données géospatiales, démographiques et d'infrastructure.

**Démo :** https://kinshasa-research.web.app/

## Aperçu

| Couche | Source | Taille | Features |
|--------|--------|--------|----------|
| Population (choroplèthe) | JICA 2019 | 2.9 Ko | 24 communes × 3 années |
| Routes principales | OSM Overpass | 272 Ko | 669 segments |
| Routes mineures | OSM Overpass | 11 Mo | 34 543 segments |
| Hôpitaux | OSM Overpass | 144 Ko | 410 |
| Écoles | OSM Overpass | 371 Ko | 1 161 |
| Stations-service | OSM Overpass | 47 Ko | 142 |
| Marchés | OSM Overpass | 23 Ko | 71 |
| Banques | OSM Overpass | 52 Ko | 148 |
| Ambassades | OSM Overpass | 28 Ko | 67 |
| Temps de trajet (matrice) | OSRM | 19 Ko | 24×24 paires |

## Stack technique

- **Vue 3** + TypeScript + Vite
- **Leaflet** — cartographie
- **Turf.js** — centroïdes et géométrie
- **OSRM** — temps de trajet routier
- **Overpass API** — extraction des données OSM

## Démarrage rapide

```bash
cd kinshasa-map
npm install
npm run dev          # → http://localhost:3000
```

### Scripts de données

```bash
# Télécharger les communes
node scripts/download-communes.mjs

# Télécharger les routes majeures / mineures
node scripts/download-roads.mjs
node scripts/download-roads-minor.mjs

# Télécharger les POI (tous ou un seul type)
node scripts/download-pois.mjs
node scripts/download-pois.mjs --only hospitals

# Calculer la matrice de temps de trajet (OSRM, gratuit)
node scripts/compute-travel-osrm.mjs
node scripts/compute-travel-osrm.mjs --dry-run

# Calculer via Google Distance Matrix ($2.88/run, nécessite .env)
node scripts/compute-travel-google.mjs --confirm
```

### Build & déploiement

```bash
npm run build        # → dist/
```

Le déploiement sur GitHub Pages est automatique via `.github/workflows/deploy.yml` à chaque push sur `main`.

## Structure du projet

```
kinshasa-map/
├── public/data/           # Données GeoJSON et JSON
│   ├── communes.geojson   # 24 communes (admin_level=7)
│   ├── roads-major.geojson
│   ├── roads-minor.geojson
│   ├── hospitals.geojson
│   ├── schools.geojson
│   ├── fuel.geojson
│   ├── markets.geojson
│   ├── banks.geojson
│   ├── embassies.geojson
│   ├── population.json
│   ├── travel-osrm.json
│   └── layers.json        # Registre déclaratif des couches
├── scripts/               # Scripts Node.js de téléchargement
├── src/
│   ├── components/        # MapContainer, LayerPanel, SourcesPanel, MapLegend
│   ├── composables/       # useChoropleth, useMarkerLayer, useMatrixLayer, ...
│   ├── pages/             # MapPage, AdminPage, AboutPage
│   ├── types/             # Interfaces TypeScript (layer.ts)
│   └── router.ts
└── .github/workflows/     # CI/CD GitHub Pages
```

## Ajouter une couche

1. Placer le fichier de données dans `public/data/`
2. Ajouter une entrée dans `public/data/layers.json` avec :
   - `id`, `name`, `description`, `type` (choropleth | markers | geojson | matrix)
   - `category` (statistics | infrastructure | poi | transport)
   - `metadata` complet (source, licence, méthodologie, notes)
3. Le front-end détecte automatiquement les nouvelles couches

## Licence

- **Code source :** MIT
- **Données OSM :** [ODbL](https://opendatacommons.org/licenses/odbl/)
- **Données JICA :** © JICA 2019, usage académique

## Documentation complémentaire

Voir [METHODOLOGY.md](METHODOLOGY.md) pour les décisions méthodologiques détaillées.

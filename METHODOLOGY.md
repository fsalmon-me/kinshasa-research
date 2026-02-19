# Méthodologie — Kinshasa Research Map

Ce document détaille les décisions méthodologiques prises lors de la construction de cette carte interactive. Il est destiné à accompagner une utilisation en contexte de recherche universitaire.

---

## 1. Découpage administratif

### Choix du niveau admin_level=7

La hiérarchie administrative OSM pour la RDC suit ce schéma :

| admin_level | Division | Exemple |
|-------------|----------|---------|
| 2 | Pays | RDC |
| 4 | Province | Kinshasa |
| 6 | Territoire/Ville | — |
| 7 | **Commune** | Lemba, Ngaliema, Kintambo |
| 8 | Quartier | — |

Le niveau 7 a été retenu car :
- C'est le niveau administratif le plus bas pour lequel des données démographiques fiables existent
- Les quartiers (niveau 8) ne sont pas systématiquement cartographiés dans OSM
- Le rapport JICA utilise le découpage communal

### Nombre de communes : 24

La province de Kinshasa comprend officiellement 24 communes. Les 24 sont présentes dans les données OSM et toutes ont des géométries fermées (polygones ou multipolygones).

### Alternative envisagée : GADM

Les limites GADM (gadm.org) sont plus lisses mais moins précises pour Kinshasa. OSM bénéficie de contributions locales et de campagnes de cartographie humanitaire (HOT, Missing Maps) qui enrichissent régulièrement les données.

---

## 2. Réseau routier

### Séparation en deux couches

| Couche | Types OSM | Segments | Taille |
|--------|-----------|----------|--------|
| Major | motorway, trunk, primary, secondary | 669 | 272 Ko |
| Minor | tertiary, residential, unclassified | 34 543 | 11 Mo |

La séparation permet :
- Un chargement rapide (seules les routes principales sont visibles par défaut)
- Un contrôle utilisateur fin (les routes mineures peuvent être activées à la demande)
- Une meilleure lisibilité cartographique à zoom faible

### Compression des données

Les coordonnées GeoJSON sont arrondies à 5 décimales (précision ~1.1 m). Pour les routes mineures, cette compression réduit la taille de 34 Mo à 11 Mo. Les propriétés `null` sont supprimées.

### Limites

La couverture OSM des routes résidentielles est inégale :
- **Bonne** dans les communes centrales (Gombe, Barumbu, Lingwala, Kintambo)
- **Moyenne** dans les communes péri-centrales (Lemba, Matete, Ngiri-Ngiri)
- **Faible** dans les communes rurales (Maluku, Nsele, Mont-Ngafula)

Ceci reflète un biais de couverture OSM commun aux villes africaines (Barrington-Leigh & Millard-Ball, 2017).

---

## 3. Points d'intérêt (POI)

### Requêtes Overpass utilisées

| Type | Tags OSM | Résultats | Couverture |
|------|----------|-----------|------------|
| Hôpitaux | `amenity=hospital` | 410 | Bonne |
| Écoles | `amenity=school` | 1 161 | Très bonne |
| Stations-service | `amenity=fuel` | 142 | Correcte |
| Marchés | `amenity=marketplace` | 71 | Faible |
| Banques | `amenity=bank` | 148 | Correcte |
| Ambassades | `office=diplomatic` | 67 | Bonne |

### Note sur la couverture

- Les **écoles** bénéficient de campagnes HOT/Missing Maps ciblées
- Les **marchés** sont sous-représentés car beaucoup sont informels (non cartographiés dans OSM)
- Les **ambassades** incluent ambassades, consulats et organisations internationales
- Les résultats OSM incluent des `node`, `way` et `relation` ; les géométries non-ponctuelles sont converties en centroïdes via Turf.js

### Licence

Toutes les données POI sont sous licence ODbL. L'attribution « © OpenStreetMap contributors » est obligatoire.

---

## 4. Temps de trajet

### Approche OSRM

1. **Calcul des centroïdes** : Pour chaque commune, le centroïde géographique est calculé via `@turf/centroid`
2. **Accrochage au réseau routier** : Le centroïde est projeté sur la route la plus proche via l'API OSRM `/nearest`
3. **Matrice de distances** : L'API OSRM `/table` calcule une matrice 24×24 en un seul appel

### Distances d'accrochage

| Commune | Distance d'accrochage (m) |
|---------|---------------------------|
| Gombe | < 50 |
| Lemba | < 50 |
| Masina | 1 388 |
| Nsele | 753 |
| Maluku | 651 |
| Limete | 795 |

Les grandes distances d'accrochage pour Masina, Nsele et Maluku s'expliquent par leur étendue géographique (communes rurales dont le centroïde tombe souvent loin du réseau routier cartographié).

### Résultats

- **Temps moyen** : 36 minutes (inter-communal)
- **Temps maximum** : 264 minutes (Maluku ↔ extrémité)
- **Couverture** : 24 × 24 = 576 paires, toutes calculées

### Limites OSRM

- Pas de données de trafic réel (temps théoriques basés sur les limitations de vitesse OSM)
- Profil `car` uniquement (pas de transport en commun)
- Les routes non cartographiées dans OSM ne sont pas considérées
- Les bacs sur le fleuve Congo ne sont pas routés

### Approche Google Distance Matrix (complémentaire)

Un script est disponible pour obtenir les temps de trajet avec données de trafic réel via l'API Google Distance Matrix :
- **Coût** : ~$2.88 par calcul complet (24 origines × 24 destinations)
- **Avantage** : Tient compte du trafic ( `departure_time=now`)
- **Safeguard** : Flag `--confirm` obligatoire pour éviter les appels accidentels
- **Configuration** : Clé API dans `.env` (fichier non versionné)

---

## 5. Données de population

### Source : JICA 2019

> Japan International Cooperation Agency. (2019). *Projet d'Élaboration du Plan Directeur des Transports Urbains de la Ville de Kinshasa*. Rapport final.

Les données incluent :
- Population estimée 2019 par commune
- Projections 2030 et 2040

### Limites

- Le dernier recensement officiel de la RDC date de **1984**
- Les estimations intermédiaires reposent sur des enquêtes ménages et de l'imagerie satellitaire
- Les projections supposent des taux de croissance constants par commune
- Le rapport JICA est la source la plus fiable publiquement disponible pour Kinshasa

---

## 6. Choix techniques

### Pourquoi pas de base de données ?

L'application est entièrement statique (GitHub Pages). Les données sont des fichiers GeoJSON/JSON servis directement. Ce choix :
- Élimine les coûts d'hébergement
- Simplifie la reproductibilité (clone + npm install + npm run dev)
- Permet un versioning complet des données avec Git

### Pourquoi Leaflet plutôt que Mapbox/MapLibre ?

- Leaflet est la bibliothèque cartographique la plus légère et la plus documentée
- Les tuiles OSM sont gratuites et sans limite d'utilisation raisonnable
- Mapbox nécessiterait une clé API et a des restrictions de licence depuis v2

### Taille des données et performance

Le fichier le plus lourd est `roads-minor.geojson` (11 Mo). Il est désactivé par défaut et ne se charge que lorsque l'utilisateur active la couche. Les communes (1.3 Mo) et les routes principales (272 Ko) se chargent à l'ouverture.

---

## Références

- Barrington-Leigh, C., & Millard-Ball, A. (2017). The world's user-generated road map is more than 80% complete. *PLOS ONE*, 12(8), e0180698.
- Japan International Cooperation Agency. (2019). *Projet d'Élaboration du Plan Directeur des Transports Urbains de la Ville de Kinshasa*. Rapport final.
- OpenStreetMap contributors. (2024). OpenStreetMap. https://www.openstreetmap.org
- OSRM. (2024). Open Source Routing Machine. https://project-osrm.org

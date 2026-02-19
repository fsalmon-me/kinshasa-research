<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { LayerConfig } from '@/types/layer'

const layers = ref<LayerConfig[]>([])

onMounted(async () => {
  const res = await fetch('/data/layers.json')
  layers.value = await res.json()
})

const categories = computed(() => {
  const catLabels: Record<string, string> = {
    statistics: 'Données statistiques',
    infrastructure: 'Infrastructure',
    poi: 'Points d\'intérêt',
    transport: 'Transport',
  }
  const map = new Map<string, LayerConfig[]>()
  for (const l of layers.value) {
    const cat = l.category ?? 'other'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(l)
  }
  return [...map.entries()].map(([key, items]) => ({
    key,
    label: catLabels[key] ?? 'Autre',
    items,
  }))
})

function formatCitation(l: LayerConfig): string {
  const m = l.metadata
  if (!m) return 'Source non documentée.'
  let cite = ''
  if (m.authors?.length) cite += m.authors.join(', ')
  else cite += m.source
  if (m.year) cite += ` (${m.year})`
  cite += '. '
  if (m.title) cite += `<em>${m.title}</em>. `
  if (m.source && m.authors?.length) cite += `${m.source}. `
  if (m.license) cite += `[${m.license}] `
  if (m.url) cite += `<br><a href="${m.url}" target="_blank">${m.url}</a>`
  return cite
}
</script>

<template>
  <div class="about-page">
    <header class="about-header">
      <router-link to="/" class="back-link">← Carte</router-link>
      <h1>À propos — Sources & Méthodologie</h1>
    </header>

    <main class="about-body">
      <section class="about-section">
        <h2>Objectif</h2>
        <p>
          Cette carte interactive présente des données géospatiales sur la ville de Kinshasa,
          République Démocratique du Congo. Elle est conçue pour servir de support à la recherche
          universitaire, en documentant rigoureusement toutes les sources de données et les
          décisions méthodologiques.
        </p>
      </section>

      <section class="about-section">
        <h2>Architecture technique</h2>
        <ul>
          <li><strong>Frontend :</strong> Vue 3 + TypeScript + Vite</li>
          <li><strong>Cartographie :</strong> Leaflet (tuiles OpenStreetMap)</li>
          <li><strong>Données géographiques :</strong> OpenStreetMap via Overpass API</li>
          <li><strong>Données statistiques :</strong> JICA (Population), OSRM (temps de trajet)</li>
          <li><strong>Hébergement :</strong> GitHub Pages (statique, aucun serveur)</li>
        </ul>
      </section>

      <section class="about-section">
        <h2>Méthodologie</h2>

        <h3>Limites communales</h3>
        <p>
          Les 24 communes de Kinshasa sont extraites d'OpenStreetMap via l'API Overpass
          (admin_level=7, correspondant aux communes dans la hiérarchie administrative de la RDC).
          Les relations OSM sont converties en polygones GeoJSON. Le niveau 8 (quartiers) n'est
          pas utilisé car la granularité des données statistiques disponibles s'arrête au niveau
          communal.
        </p>

        <h3>Réseau routier</h3>
        <p>
          Le réseau routier est séparé en deux couches pour optimiser les performances :
        </p>
        <ul>
          <li><strong>Routes principales</strong> : motorway, trunk, primary, secondary (669 segments, ~272 Ko)</li>
          <li><strong>Routes mineures</strong> : tertiary, residential, unclassified (34 543 segments, ~11 Mo)</li>
        </ul>
        <p>
          Les coordonnées sont arrondies à 5 décimales (~1.1m de précision) pour réduire la taille
          des fichiers. La couverture OSM des routes résidentielles est inégale — plus complète dans
          les communes centrales que périphériques.
        </p>

        <h3>Points d'intérêt</h3>
        <p>
          Tous les POI proviennent d'OpenStreetMap (licence ODbL). Les requêtes Overpass ciblent
          des tags spécifiques (amenity=hospital, amenity=school, etc.). La couverture est variable :
          bonne pour les écoles (campagnes HOT/Missing Maps), modérée pour la santé et les
          stations-service, faible pour les marchés informels.
        </p>

        <h3>Temps de trajet</h3>
        <p>
          Les temps de trajet inter-communaux sont calculés via OSRM (Open Source Routing Machine)
          utilisant les données routières OSM. Pour chaque commune, le point de référence est le
          centroïde géographique accroché à la route la plus proche (via OSRM /nearest), évitant
          ainsi de placer le point au milieu d'une zone non accessible (forêt, rivière).
          La matrice 24×24 est calculée en un seul appel à l'API /table.
        </p>
        <p>
          Un script Google Distance Matrix API est également disponible pour comparaison avec
          données de trafic réel ($2.88 par calcul, couvert par le crédit gratuit de $200/mois).
        </p>

        <h3>Données de population</h3>
        <p>
          Les estimations de population proviennent du rapport JICA
          <em>"Projet d'Élaboration du Plan Directeur des Transports Urbains de la Ville de Kinshasa"</em>
          (2019). Les projections 2030 et 2040 sont des extrapolations de tendances démographiques.
          Le dernier recensement officiel de la RDC date de 1984 ; les données intermédiaires
          reposent sur des enquêtes ménages et de l'imagerie satellitaire.
        </p>
      </section>

      <section class="about-section">
        <h2>Sources des données par couche</h2>

        <div v-for="cat in categories" :key="cat.key" class="source-category">
          <h3>{{ cat.label }}</h3>
          <div v-for="l in cat.items" :key="l.id" class="source-card">
            <div class="source-name">{{ l.name }}</div>
            <div class="source-desc">{{ l.description }}</div>
            <div class="source-cite" v-html="formatCitation(l)"></div>
            <div v-if="l.metadata?.methodology" class="source-detail">
              <strong>Méthodologie :</strong> {{ l.metadata.methodology }}
            </div>
            <div v-if="l.metadata?.notes" class="source-note">
              <strong>⚠ Limites :</strong> {{ l.metadata.notes }}
            </div>
          </div>
        </div>
      </section>

      <section class="about-section">
        <h2>Licence</h2>
        <p>
          Les données OpenStreetMap sont sous licence
          <a href="https://opendatacommons.org/licenses/odbl/" target="_blank">ODbL</a>.
          Le code source de cette application est disponible sur
          <a href="https://github.com/fsalmon-hq/kinshasa-research" target="_blank">GitHub</a>.
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.about-page {
  min-height: 100vh;
  background: #f8f9fa;
  font-family: system-ui, -apple-system, sans-serif;
}

.about-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
  background: #2c7fb8;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.about-header h1 {
  font-size: 18px;
  margin: 0;
  font-weight: 600;
}

.back-link {
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.15);
}

.back-link:hover {
  background: rgba(255, 255, 255, 0.25);
}

.about-body {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.about-section {
  margin-bottom: 32px;
}

.about-section h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 2px solid #2c7fb8;
}

.about-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 16px 0 6px 0;
}

.about-section p, .about-section li {
  font-size: 14px;
  line-height: 1.7;
  color: #444;
}

.about-section ul {
  padding-left: 20px;
  margin: 8px 0;
}

.source-category {
  margin-bottom: 20px;
}

.source-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 10px;
}

.source-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 2px;
}

.source-desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.source-cite {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
  margin-bottom: 4px;
}

.source-cite :deep(em) {
  font-style: italic;
}

.source-cite :deep(a) {
  color: #2c7fb8;
  word-break: break-all;
}

.source-detail {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  margin-top: 6px;
}

.source-note {
  font-size: 12px;
  color: #888;
  font-style: italic;
  line-height: 1.5;
  margin-top: 4px;
}
</style>

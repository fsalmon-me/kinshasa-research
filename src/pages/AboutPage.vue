<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LayerConfig } from '@/types/layer'
import { formatCitation, generateBibtexFile } from '@/utils/citation'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'

const { t } = useI18n()

const layers = ref<LayerConfig[]>([])

const base = import.meta.env.BASE_URL.replace(/\/$/, '')

onMounted(async () => {
  const res = await fetch(`${base}/data/layers.json`)
  layers.value = await res.json()
})

const categories = computed(() => {
  const catLabels: Record<string, string> = {
    statistics: t('categories.statistics'),
    infrastructure: t('categories.infrastructure'),
    poi: t('categories.poi'),
    transport: t('categories.transport'),
  }
  const map = new Map<string, LayerConfig[]>()
  for (const l of layers.value) {
    const cat = l.category ?? 'other'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(l)
  }
  return [...map.entries()].map(([key, items]) => ({
    key,
    label: catLabels[key] ?? t('categories.other'),
    items,
  }))
})

function downloadBibtex() {
  const bib = generateBibtexFile(layers.value)
  const blob = new Blob([bib], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'kinshasa-sources.bib'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="about-page">
    <header class="about-header">
      <router-link to="/" class="back-link">← {{ t('common.map') }}</router-link>
      <h1>{{ t('aboutPage.title') }}</h1>
      <LocaleSwitcher />
    </header>

    <main class="about-body">
      <section class="about-section">
        <h2>{{ t('aboutPage.objectiveTitle') }}</h2>
        <p>{{ t('aboutPage.objectiveText') }}</p>
      </section>

      <section class="about-section">
        <h2>{{ t('aboutPage.architectureTitle') }}</h2>
        <ul>
          <li><strong>Frontend :</strong> Vue 3 + TypeScript + Vite</li>
          <li><strong>{{ t('aboutPage.mapping') }} :</strong> Leaflet ({{ t('aboutPage.osmTiles') }})</li>
          <li><strong>{{ t('aboutPage.geoData') }} :</strong> OpenStreetMap via Overpass API</li>
          <li><strong>{{ t('aboutPage.statData') }} :</strong> JICA (Population), OSRM ({{ t('aboutPage.travelTime') }})</li>
          <li><strong>{{ t('aboutPage.hosting') }} :</strong> GitHub Pages ({{ t('aboutPage.static') }})</li>
        </ul>
      </section>

      <section class="about-section">
        <h2>{{ t('aboutPage.methodologyTitle') }}</h2>

        <h3>{{ t('aboutPage.communeBoundariesTitle') }}</h3>
        <p>{{ t('aboutPage.communeBoundariesText') }}</p>

        <h3>{{ t('aboutPage.roadNetworkTitle') }}</h3>
        <p>{{ t('aboutPage.roadNetworkText1') }}</p>
        <ul>
          <li><strong>{{ t('aboutPage.mainRoads') }}</strong> : motorway, trunk, primary, secondary (669 segments, ~272 Ko)</li>
          <li><strong>{{ t('aboutPage.minorRoads') }}</strong> : tertiary, residential, unclassified (34 543 segments, ~11 Mo)</li>
        </ul>
        <p>{{ t('aboutPage.roadNetworkText2') }}</p>

        <h3>{{ t('aboutPage.poiTitle') }}</h3>
        <p>{{ t('aboutPage.poiText') }}</p>

        <h3>{{ t('aboutPage.travelTimeTitle') }}</h3>
        <p>{{ t('aboutPage.travelTimeText1') }}</p>
        <p>{{ t('aboutPage.travelTimeText2') }}</p>

        <h3>{{ t('aboutPage.populationTitle') }}</h3>
        <p>{{ t('aboutPage.populationText') }}</p>
      </section>

      <section class="about-section">
        <h2>{{ t('aboutPage.sourcesTitle') }}</h2>
        <button class="bibtex-btn" @click="downloadBibtex">📥 {{ t('aboutPage.downloadBibtex') }}</button>

        <div v-for="cat in categories" :key="cat.key" class="source-category">
          <h3>{{ cat.label }}</h3>
          <div v-for="l in cat.items" :key="l.id" class="source-card">
            <div class="source-name">
              {{ l.name }}
              <span v-if="l.metadata?.accessDate" class="freshness-badge">📅 {{ l.metadata.accessDate }}</span>
            </div>
            <div class="source-desc">{{ l.description }}</div>
            <div class="source-cite" v-html="formatCitation(l)"></div>
            <div v-if="l.metadata?.methodology" class="source-detail">
              <strong>{{ t('aboutPage.methodologyLabel') }}</strong> {{ l.metadata.methodology }}
            </div>
            <div v-if="l.metadata?.notes" class="source-note">
              <strong>⚠ {{ t('aboutPage.limitsLabel') }}</strong> {{ l.metadata.notes }}
            </div>
          </div>
        </div>
      </section>

      <section class="about-section">
        <h2>{{ t('aboutPage.licenseTitle') }}</h2>
        <p v-html="t('aboutPage.licenseText')"></p>
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.freshness-badge {
  font-size: 11px;
  font-weight: 400;
  color: #888;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 3px;
}

.bibtex-btn {
  display: inline-block;
  margin-bottom: 12px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #2c7fb8;
  background: #e8f4fd;
  border: 1px solid #b3d9f2;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.bibtex-btn:hover {
  background: #d0ecfa;
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

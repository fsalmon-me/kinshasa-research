<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Report } from '@/types/report'
import { fetchReportList, fetchReport, reports, loading } from '@/composables/useReportStore'
import BlockEditor from '@/components/report/BlockEditor.vue'

const route = useRoute()
const activeReport = ref<Report | null>(null)
const listMode = ref(true)

async function loadList() {
  await fetchReportList()
  // If slug in route, load that report directly
  const slug = route.params.slug as string | undefined
  if (slug) {
    activeReport.value = await fetchReport(slug)
    listMode.value = false
  }
}

function openReport(report: Report) {
  activeReport.value = report
  listMode.value = false
  // update URL without reload
  window.history.replaceState({}, '', `/reports/${report.slug}`)
}

function backToList() {
  activeReport.value = null
  listMode.value = true
  window.history.replaceState({}, '', '/reports')
}

onMounted(loadList)

watch(() => route.params.slug, async (slug) => {
  if (slug && typeof slug === 'string') {
    activeReport.value = await fetchReport(slug)
    listMode.value = false
  } else {
    activeReport.value = null
    listMode.value = true
  }
})
</script>

<template>
  <div class="reports-page">
    <header class="reports-header">
      <router-link to="/" class="back-link">← Carte</router-link>
      <h1>📊 Rapports</h1>
      <router-link to="/admin" class="new-report-btn">+ Nouveau rapport</router-link>
    </header>

    <!-- List view -->
    <div v-if="listMode" class="reports-list">
      <p v-if="loading" class="loading-msg">Chargement…</p>
      <div v-else-if="reports.length === 0" class="empty-state">
        <p class="empty-icon">📊</p>
        <p class="empty-title">Aucun rapport disponible</p>
        <p class="empty-text">Les rapports permettent d'analyser les données géographiques de Kinshasa.</p>
        <router-link to="/admin" class="empty-cta">Créer un rapport →</router-link>
      </div>
      <div v-else class="report-cards">
        <article
          v-for="r in reports"
          :key="r.id"
          class="report-card"
          @click="openReport(r)"
        >
          <h2>{{ r.title }}</h2>
          <p v-if="r.description">{{ r.description }}</p>
          <span class="report-date">{{ new Date(r.updatedAt || r.createdAt).toLocaleDateString('fr-FR') }}</span>
        </article>
      </div>
    </div>

    <!-- Report view -->
    <div v-else-if="activeReport" class="report-view">
      <button class="back-btn" @click="backToList">← Tous les rapports</button>
      <h1 class="report-title">{{ activeReport.title }}</h1>
      <p v-if="activeReport.description" class="report-desc">{{ activeReport.description }}</p>

      <div class="report-blocks">
        <BlockEditor
          v-for="(block, i) in activeReport.blocks"
          :key="block.id"
          :block="block"
          :index="i"
          :total="activeReport.blocks.length"
          :editable="false"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.reports-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.reports-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 16px;
}
.reports-header h1 { margin: 0; font-size: 22px; }
.back-link {
  color: #555;
  text-decoration: none;
  font-size: 14px;
}
.back-link:hover { color: #111; }
.loading-msg, .empty-msg { color: #888; font-size: 14px; }

.new-report-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: #2c7fb8;
  color: #fff;
  border-radius: 6px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s;
}
.new-report-btn:hover { background: #256a9e; }

.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon { font-size: 48px; margin: 0 0 12px; }
.empty-title { font-size: 18px; font-weight: 600; margin: 0 0 8px; color: #333; }
.empty-text { font-size: 14px; color: #888; margin: 0 0 20px; }
.empty-cta {
  display: inline-block;
  padding: 8px 20px;
  background: #2c7fb8;
  color: #fff;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
}
.empty-cta:hover { background: #256a9e; }

.report-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.report-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.report-card:hover {
  border-color: #bbb;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.report-card h2 { margin: 0 0 8px; font-size: 17px; }
.report-card p { margin: 0 0 8px; color: #666; font-size: 13px; }
.report-date { font-size: 11px; color: #aaa; }

.back-btn {
  border: none;
  background: none;
  color: #555;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  margin-bottom: 16px;
}
.back-btn:hover { color: #111; }
.report-title { margin: 0 0 8px; font-size: 26px; }
.report-desc { color: #666; margin: 0 0 24px; font-size: 15px; }
.report-blocks { display: flex; flex-direction: column; gap: 8px; }
</style>

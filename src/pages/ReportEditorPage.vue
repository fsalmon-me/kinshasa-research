<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Report, ReportBlock } from '@/types/report'
import {
  fetchReport,
  fetchReportList,
  saveReport,
  deleteReport,
  slugify,
  newBlockId,
} from '@/composables/useReportStore'
import BlockEditor from '@/components/report/BlockEditor.vue'

const route = useRoute()
const router = useRouter()

const report = ref<Report | null>(null)
const saving = ref(false)
const statusMsg = ref('')
let statusTimer: ReturnType<typeof setTimeout> | null = null

function showStatus(msg: string, ms = 4000) {
  if (statusTimer) clearTimeout(statusTimer)
  statusMsg.value = msg
  statusTimer = setTimeout(() => { statusMsg.value = '' }, ms)
}

// ---- Load / Create ----
onMounted(async () => {
  const slug = route.params.slug as string | undefined
  if (slug) {
    await fetchReportList()
    const found = await fetchReport(slug)
    if (found) {
      report.value = JSON.parse(JSON.stringify(found)) // deep copy for editing
      return
    }
  }
  // New report
  report.value = {
    id: `rpt_${Date.now().toString(36)}`,
    title: 'Nouveau rapport',
    slug: '',
    description: '',
    blocks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
})

// ---- Block management ----
function addBlock(type: ReportBlock['type']) {
  if (!report.value) return
  const id = newBlockId()
  let block: ReportBlock
  switch (type) {
    case 'title':
      block = { type: 'title', id, level: 2, content: 'Titre' }
      break
    case 'text':
      block = { type: 'text', id, content: 'Texte…' }
      break
    case 'table':
      block = { type: 'table', id, title: 'Tableau', dataSource: 'fuel-demand.json', columns: [] }
      break
    case 'chart':
      block = { type: 'chart', id, title: 'Graphique', chartType: 'bar', dataSource: 'fuel-demand.json', labelField: 'commune', datasets: [] }
      break
    case 'sources':
      block = { type: 'sources', id, title: 'Sources', autoCollect: true, items: [] }
      break
  }
  report.value.blocks.push(block)
}

function updateBlock(index: number, block: ReportBlock) {
  if (!report.value) return
  report.value.blocks[index] = block
}

function removeBlock(index: number) {
  if (!report.value) return
  report.value.blocks.splice(index, 1)
}

function moveUp(index: number) {
  if (!report.value || index <= 0) return
  const blocks = report.value.blocks
  ;[blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]]
}

function moveDown(index: number) {
  if (!report.value || index >= report.value.blocks.length - 1) return
  const blocks = report.value.blocks
  ;[blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]]
}

// ---- Save ----
async function handleSave() {
  if (!report.value) return
  // Auto-generate slug from title
  if (!report.value.slug) {
    report.value.slug = slugify(report.value.title)
  }
  saving.value = true
  try {
    await saveReport(report.value)
    showStatus('✓ Rapport sauvegardé')
  } catch (e: any) {
    showStatus(`✗ Erreur: ${e.message}`)
  } finally {
    saving.value = false
  }
}

// ---- Delete ----
async function handleDelete() {
  if (!report.value) return
  if (!confirm(`Supprimer « ${report.value.title} » ?`)) return
  try {
    await deleteReport(report.value.id)
    router.push('/reports')
  } catch (e: any) {
    showStatus(`✗ Erreur: ${e.message}`)
  }
}

// ---- Block JSON editor (advanced) ----
const showJsonEditor = ref(false)
const jsonDraft = ref('')

function openJsonEditor() {
  if (!report.value) return
  jsonDraft.value = JSON.stringify(report.value.blocks, null, 2)
  showJsonEditor.value = true
}

function applyJson() {
  if (!report.value) return
  try {
    report.value.blocks = JSON.parse(jsonDraft.value)
    showJsonEditor.value = false
    showStatus('✓ Blocs mis à jour depuis JSON')
  } catch (e: any) {
    showStatus(`✗ JSON invalide: ${e.message}`)
  }
}
</script>

<template>
  <div class="editor-page" v-if="report">
    <!-- Header -->
    <header class="editor-header">
      <router-link to="/admin" class="back-link">← Admin</router-link>
      <router-link to="/reports" class="back-link">📊 Rapports</router-link>
      <div class="spacer"></div>
      <span v-if="statusMsg" class="status-msg">{{ statusMsg }}</span>
      <button class="btn btn-save" @click="handleSave" :disabled="saving">
        {{ saving ? 'Sauvegarde…' : '💾 Sauvegarder' }}
      </button>
      <button class="btn btn-json" @click="openJsonEditor">{ } JSON</button>
      <button class="btn btn-danger" @click="handleDelete">🗑 Supprimer</button>
    </header>

    <!-- Report metadata -->
    <section class="meta-section">
      <div class="meta-field">
        <label>Titre</label>
        <input v-model="report.title" class="meta-input" placeholder="Titre du rapport" />
      </div>
      <div class="meta-field">
        <label>Slug</label>
        <input v-model="report.slug" class="meta-input meta-slug" placeholder="auto-généré" />
      </div>
      <div class="meta-field">
        <label>Description</label>
        <input v-model="report.description" class="meta-input" placeholder="Description courte" />
      </div>
    </section>

    <!-- Block list -->
    <section class="blocks-section">
      <BlockEditor
        v-for="(block, i) in report.blocks"
        :key="block.id"
        :block="block"
        :index="i"
        :total="report.blocks.length"
        :editable="true"
        @update="updateBlock"
        @remove="removeBlock"
        @moveUp="moveUp"
        @moveDown="moveDown"
      />

      <!-- Add block controls -->
      <div class="add-block">
        <span class="add-label">+ Ajouter :</span>
        <button class="add-btn" @click="addBlock('title')">Titre</button>
        <button class="add-btn" @click="addBlock('text')">Texte</button>
        <button class="add-btn" @click="addBlock('table')">Tableau</button>
        <button class="add-btn" @click="addBlock('chart')">Graphique</button>
        <button class="add-btn" @click="addBlock('sources')">📚 Sources</button>
      </div>
    </section>

    <!-- JSON editor modal -->
    <div v-if="showJsonEditor" class="json-overlay" @click.self="showJsonEditor = false">
      <div class="json-modal">
        <h3>Édition JSON des blocs</h3>
        <textarea v-model="jsonDraft" class="json-textarea" rows="24"></textarea>
        <div class="json-actions">
          <button class="btn btn-save" @click="applyJson">Appliquer</button>
          <button class="btn" @click="showJsonEditor = false">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
}
.back-link {
  color: #555;
  text-decoration: none;
  font-size: 13px;
}
.back-link:hover { color: #111; }
.spacer { flex: 1; }
.status-msg { font-size: 13px; color: #388e3c; }
.btn {
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}
.btn:hover { background: #f5f5f5; }
.btn-save { border-color: #388e3c; color: #388e3c; }
.btn-save:hover { background: #e8f5e9; }
.btn-json { border-color: #1565c0; color: #1565c0; }
.btn-json:hover { background: #e3f2fd; }
.btn-danger { border-color: #c62828; color: #c62828; }
.btn-danger:hover { background: #fce4ec; }

/* Meta fields */
.meta-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #eee;
}
.meta-field label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #999;
  margin-bottom: 4px;
}
.meta-input {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 14px;
  box-sizing: border-box;
}
.meta-slug { font-family: monospace; font-size: 13px; }

/* Blocks */
.blocks-section { margin-bottom: 32px; }
.add-block {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  border: 2px dashed #ddd;
  border-radius: 8px;
}
.add-label { font-size: 13px; color: #888; font-weight: 500; }
.add-btn {
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}
.add-btn:hover { background: #f0f0f0; }

/* JSON modal */
.json-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.json-modal {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  overflow: auto;
}
.json-modal h3 { margin: 0 0 12px; }
.json-textarea {
  width: 100%;
  font-family: monospace;
  font-size: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  box-sizing: border-box;
}
.json-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>

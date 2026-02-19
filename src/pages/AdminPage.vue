<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { DataRecord } from '@/types/data'

interface DatasetMeta {
  file: string
  label: string
}

const datasets = ref<DatasetMeta[]>([
  { file: 'population.json', label: 'Population' },
])

const activeFile = ref('population.json')
const rows = ref<DataRecord[]>([])
const columns = ref<string[]>([])
const importError = ref('')
const saveStatus = ref('')

onMounted(() => {
  loadDataset(activeFile.value)
})

async function loadDataset(file: string) {
  activeFile.value = file
  importError.value = ''
  saveStatus.value = ''
  try {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    const res = await fetch(`${base}/data/${file}`)
    const data: DataRecord[] = await res.json()
    rows.value = data
    columns.value = data.length > 0 ? Object.keys(data[0]) : []
  } catch (e: any) {
    importError.value = `Impossible de charger ${file}: ${e.message}`
  }
}

function updateCell(rowIdx: number, col: string, value: string) {
  const parsed = Number(value)
  ;(rows.value[rowIdx] as any)[col] = isNaN(parsed) ? value : parsed
}

function addRow() {
  const empty: Record<string, any> = {}
  columns.value.forEach((c) => (empty[c] = ''))
  rows.value.push(empty)
}

function deleteRow(idx: number) {
  rows.value.splice(idx, 1)
}

function exportJson() {
  const blob = new Blob([JSON.stringify(rows.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = activeFile.value
  a.click()
  URL.revokeObjectURL(url)
}

function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string)
      if (!Array.isArray(data)) throw new Error('Le fichier doit contenir un tableau JSON')
      rows.value = data
      columns.value = data.length > 0 ? Object.keys(data[0]) : []
      importError.value = ''
      saveStatus.value = 'Import réussi — pensez à exporter pour sauvegarder.'
    } catch (e: any) {
      importError.value = `Erreur d'import: ${e.message}`
    }
  }
  reader.readAsText(input.files[0])
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-header">
      <router-link to="/" class="back-link">← Carte</router-link>
      <h1>Administration des données</h1>
    </header>

    <div class="admin-body">
      <aside class="sidebar">
        <h3>Jeux de données</h3>
        <button
          v-for="ds in datasets"
          :key="ds.file"
          :class="['ds-btn', { active: ds.file === activeFile }]"
          @click="loadDataset(ds.file)"
        >
          {{ ds.label }}
        </button>
      </aside>

      <main class="editor">
        <div class="toolbar">
          <button class="btn" @click="addRow">+ Ligne</button>
          <button class="btn primary" @click="exportJson">⬇ Exporter JSON</button>
          <label class="btn">
            ⬆ Importer JSON
            <input type="file" accept=".json" hidden @change="importFile" />
          </label>
        </div>

        <div v-if="importError" class="msg error">{{ importError }}</div>
        <div v-if="saveStatus" class="msg success">{{ saveStatus }}</div>

        <div class="table-wrapper">
          <table v-if="rows.length">
            <thead>
              <tr>
                <th>#</th>
                <th v-for="col in columns" :key="col">{{ col }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in rows" :key="ri">
                <td class="row-num">{{ ri + 1 }}</td>
                <td v-for="col in columns" :key="col">
                  <input
                    :value="(row as any)[col]"
                    @input="updateCell(ri, col, ($event.target as HTMLInputElement).value)"
                  />
                </td>
                <td>
                  <button class="del-btn" @click="deleteRow(ri)">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="empty">Aucune donnée.</p>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  font-family: system-ui, sans-serif;
}

.admin-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #2c7fb8;
  color: #fff;
}

.admin-header h1 {
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

.admin-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 180px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  padding: 12px;
}

.sidebar h3 {
  font-size: 13px;
  margin: 0 0 8px 0;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ds-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #444;
}

.ds-btn:hover {
  background: #f0f0f0;
}

.ds-btn.active {
  background: #e3f2fd;
  color: #2c7fb8;
  font-weight: 600;
}

.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  overflow: auto;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn:hover {
  background: #f5f5f5;
}

.btn.primary {
  background: #2c7fb8;
  color: #fff;
  border-color: #2c7fb8;
}

.btn.primary:hover {
  background: #256a9e;
}

.msg {
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 8px;
}

.msg.error {
  background: #fce4ec;
  color: #c62828;
}

.msg.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.table-wrapper {
  flex: 1;
  overflow: auto;
}

table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
}

th,
td {
  border: 1px solid #e0e0e0;
  padding: 4px 8px;
  text-align: left;
}

th {
  background: #f5f5f5;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}

.row-num {
  color: #999;
  width: 30px;
  text-align: center;
}

td input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 13px;
  padding: 2px 0;
}

td input:focus {
  outline: 2px solid #2c7fb8;
  border-radius: 2px;
}

.del-btn {
  border: none;
  background: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
}

.del-btn:hover {
  color: #c62828;
}

.empty {
  color: #999;
  text-align: center;
  padding: 40px 0;
}
</style>

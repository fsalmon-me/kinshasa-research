<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableBlock } from '@/types/report'
import { fetchData } from '@/composables/useDataStore'

const { t, locale } = useI18n()

const props = defineProps<{
  block: TableBlock
  editable?: boolean
}>()

const emit = defineEmits<{
  update: [block: TableBlock]
}>()

const rows = ref<Record<string, unknown>[]>([])
const error = ref('')

async function loadData() {
  error.value = ''
  try {
    // Use inlineData if present, otherwise fetch from dataSource
    let data: Record<string, unknown>[]
    if (props.block.inlineData && props.block.inlineData.length > 0) {
      data = props.block.inlineData
    } else {
      data = [...(await fetchData(props.block.dataSource))] as Record<string, unknown>[]
    }
    let result = [...data]

    // Apply filters
    if (props.block.filters) {
      for (const [key, val] of Object.entries(props.block.filters)) {
        result = result.filter(r => r[key] === val)
      }
    }

    // Sort
    if (props.block.sortBy) {
      const dir = props.block.sortDir === 'desc' ? -1 : 1
      const field = props.block.sortBy
      result.sort((a, b) => {
        const va = a[field] as number | string ?? 0
        const vb = b[field] as number | string ?? 0
        return va < vb ? -dir : va > vb ? dir : 0
      })
    }

    // Limit
    if (props.block.limit && props.block.limit > 0) {
      result = result.slice(0, props.block.limit)
    }

    rows.value = result
  } catch (e: any) {
    error.value = t('tableBlock.error', { message: e.message })
  }
}

function formatCell(value: unknown, col: typeof props.block.columns[0]): string {
  if (value == null) return '—'
  if (col.format === 'number') {
    const num = Number(value)
    if (isNaN(num)) return String(value)
    const loc = locale.value === 'en' ? 'en-US' : 'fr-FR'
    return num.toLocaleString(loc, { maximumFractionDigits: col.decimals ?? 0 })
  }
  if (col.format === 'percent') {
    const num = Number(value)
    if (isNaN(num)) return String(value)
    return (num * 100).toFixed(col.decimals ?? 1) + ' %'
  }
  return String(value)
}

onMounted(loadData)
watch(() => props.block.dataSource, loadData)
watch(() => props.block.inlineData, loadData)
</script>

<template>
  <div class="report-table-block">
    <div v-if="block.title" class="table-title">{{ block.title }}</div>
    <div v-if="error" class="table-error">{{ error }}</div>
    <div class="table-scroll">
      <table v-if="rows.length">
        <thead>
          <tr>
            <th v-for="col in block.columns" :key="col.field">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="i">
            <td v-for="col in block.columns" :key="col.field" :class="{ numeric: col.format === 'number' || col.format === 'percent' }">
              {{ formatCell(row[col.field], col) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!error" class="empty">{{ t('tableBlock.empty') }}</p>
    </div>
  </div>
</template>

<style scoped>
.report-table-block {
  margin-bottom: 16px;
}
.table-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #333;
}
.table-error {
  color: #c62828;
  font-size: 13px;
  margin-bottom: 8px;
}
.table-scroll {
  overflow-x: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
}
th, td {
  border: 1px solid #e0e0e0;
  padding: 6px 10px;
  text-align: left;
}
th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 12px;
  color: #555;
  white-space: nowrap;
}
td.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
tr:nth-child(even) td {
  background: #fafafa;
}
.empty {
  color: #999;
  font-size: 13px;
  padding: 16px;
  text-align: center;
}
</style>

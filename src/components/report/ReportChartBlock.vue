<script setup lang="ts">
import { ref, onMounted, watch, shallowRef } from 'vue'
import { Bar, Pie, Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import type { ChartBlock } from '@/types/report'
import { fetchData } from '@/composables/useDataStore'

// Register Chart.js components
ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, ArcElement, PointElement, LineElement,
  Title, Tooltip, Legend,
)

const props = defineProps<{
  block: ChartBlock
  editable?: boolean
}>()

const chartData = shallowRef<any>(null)
const error = ref('')

// Color palette fallback
const PALETTE = [
  '#2c7fb8', '#e34a33', '#41b6c4', '#f39c12', '#27ae60',
  '#8e44ad', '#c0392b', '#3498db', '#1abc9c', '#e67e22',
]

async function loadData() {
  error.value = ''
  try {
    const data = await fetchData(props.block.dataSource)
    const records = data as Record<string, unknown>[]

    const labels = records.map(r => String(r[props.block.labelField] ?? ''))

    const datasets = props.block.datasets.map((ds, i) => ({
      label: ds.label,
      data: records.map(r => Number(r[ds.field]) || 0),
      backgroundColor: ds.backgroundColor ?? ds.color ?? PALETTE[i % PALETTE.length],
      borderColor: ds.color ?? PALETTE[i % PALETTE.length],
      borderWidth: props.block.chartType === 'line' ? 2 : 0,
    }))

    chartData.value = { labels, datasets }
  } catch (e: any) {
    error.value = `Erreur: ${e.message}`
  }
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
  },
}

onMounted(loadData)
watch(() => props.block.dataSource, loadData)
</script>

<template>
  <div class="report-chart-block">
    <div v-if="block.title" class="chart-title">{{ block.title }}</div>
    <div v-if="error" class="chart-error">{{ error }}</div>
    <div v-else-if="chartData" class="chart-container">
      <Bar v-if="block.chartType === 'bar'" :data="chartData" :options="chartOptions" />
      <Line v-else-if="block.chartType === 'line'" :data="chartData" :options="chartOptions" />
      <Pie v-else-if="block.chartType === 'pie'" :data="chartData" :options="chartOptions" />
      <Doughnut v-else-if="block.chartType === 'doughnut'" :data="chartData" :options="chartOptions" />
    </div>
    <div v-else class="chart-loading">Chargement…</div>
  </div>
</template>

<style scoped>
.report-chart-block {
  margin-bottom: 16px;
}
.chart-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #333;
}
.chart-error {
  color: #c62828;
  font-size: 13px;
}
.chart-container {
  position: relative;
  height: 350px;
  max-width: 100%;
}
.chart-loading {
  color: #999;
  font-size: 13px;
  padding: 40px;
  text-align: center;
}
</style>

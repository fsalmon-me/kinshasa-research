<script setup lang="ts">
import type { ReportBlock } from '@/types/report'
import ReportTitleBlock from './ReportTitleBlock.vue'
import ReportTextBlock from './ReportTextBlock.vue'
import ReportTableBlock from './ReportTableBlock.vue'
import ReportChartBlock from './ReportChartBlock.vue'
import ReportSourcesBlock from './ReportSourcesBlock.vue'

defineProps<{
  block: ReportBlock
  index: number
  total: number
  editable?: boolean
}>()

const emit = defineEmits<{
  update: [index: number, block: ReportBlock]
  remove: [index: number]
  moveUp: [index: number]
  moveDown: [index: number]
}>()


</script>

<template>
  <div class="block-wrapper" :class="{ editing: editable }">
    <!-- Edit controls -->
    <div v-if="editable" class="block-controls">
      <span class="block-type">{{ block.type }}</span>
      <div class="block-actions">
        <button v-if="index > 0" class="ctrl-btn" @click="emit('moveUp', index)" title="Monter">↑</button>
        <button v-if="index < total - 1" class="ctrl-btn" @click="emit('moveDown', index)" title="Descendre">↓</button>
        <button class="ctrl-btn ctrl-danger" @click="emit('remove', index)" title="Supprimer">✕</button>
      </div>
    </div>

    <!-- Block content -->
    <ReportTitleBlock
      v-if="block.type === 'title'"
      :block="block"
      :editable="editable"
      @update="b => emit('update', index, b)"
    />
    <ReportTextBlock
      v-else-if="block.type === 'text'"
      :block="block"
      :editable="editable"
      @update="b => emit('update', index, b)"
    />
    <ReportTableBlock
      v-else-if="block.type === 'table'"
      :block="block"
      :editable="editable"
    />
    <ReportChartBlock
      v-else-if="block.type === 'chart'"
      :block="block"
      :editable="editable"
    />
    <ReportSourcesBlock
      v-else-if="block.type === 'sources'"
      :block="block"
      :editable="editable"
      @update="b => emit('update', index, b)"
    />
  </div>
</template>

<style scoped>
.block-wrapper {
  margin-bottom: 4px;
}
.block-wrapper.editing {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 8px;
  transition: border-color 0.15s;
}
.block-wrapper.editing:hover {
  border-color: #d0d0d0;
  background: #fafafa;
}
.block-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 11px;
}
.block-type {
  color: #999;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.block-actions {
  display: flex;
  gap: 2px;
}
.ctrl-btn {
  border: none;
  background: #eee;
  color: #555;
  width: 22px;
  height: 22px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ctrl-btn:hover { background: #ddd; }
.ctrl-danger:hover { background: #fce4ec; color: #c62828; }
</style>

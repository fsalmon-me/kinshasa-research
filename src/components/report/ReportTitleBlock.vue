<script setup lang="ts">
import type { TitleBlock } from '@/types/report'

const props = defineProps<{
  block: TitleBlock
  editable?: boolean
}>()

const emit = defineEmits<{
  update: [block: TitleBlock]
}>()

function onInput(e: Event) {
  const text = (e.target as HTMLElement).textContent ?? ''
  emit('update', { ...props.block, content: text })
}
</script>

<template>
  <component
    :is="'h' + block.level"
    class="report-title"
    :class="'level-' + block.level"
    :contenteditable="editable"
    @blur="editable && onInput($event)"
    v-text="block.content"
  />
</template>

<style scoped>
.report-title {
  margin: 0;
  color: #1a1a1a;
}
.level-1 { font-size: 24px; margin-bottom: 16px; border-bottom: 2px solid #2c7fb8; padding-bottom: 8px; }
.level-2 { font-size: 20px; margin-bottom: 12px; color: #2c7fb8; }
.level-3 { font-size: 16px; margin-bottom: 8px; color: #555; }
[contenteditable="true"] {
  outline: none;
  border: 1px dashed #ccc;
  padding: 4px 8px;
  border-radius: 4px;
}
[contenteditable="true"]:focus {
  border-color: #2c7fb8;
  background: #f8fbff;
}
</style>

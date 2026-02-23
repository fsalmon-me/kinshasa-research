<script setup lang="ts">
import type { TextBlock } from '@/types/report'

const props = defineProps<{
  block: TextBlock
  editable?: boolean
}>()

const emit = defineEmits<{
  update: [block: TextBlock]
}>()

function onInput(e: Event) {
  const text = (e.target as HTMLElement).innerText ?? ''
  emit('update', { ...props.block, content: text })
}
</script>

<template>
  <div
    class="report-text"
    :contenteditable="editable"
    @blur="editable && onInput($event)"
    v-text="block.content"
  />
</template>

<style scoped>
.report-text {
  font-size: 14px;
  line-height: 1.7;
  color: #333;
  margin-bottom: 12px;
  white-space: pre-wrap;
}
[contenteditable="true"] {
  outline: none;
  border: 1px dashed #ccc;
  padding: 8px 12px;
  border-radius: 4px;
  min-height: 40px;
}
[contenteditable="true"]:focus {
  border-color: #2c7fb8;
  background: #f8fbff;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LayerConfig } from '@/types/layer'
import { formatCitation } from '@/utils/citation'

const props = defineProps<{
  layers: LayerConfig[]
}>()

const open = ref(false)

const layersWithMetadata = computed(() =>
  props.layers.filter(l => l.metadata)
)
</script>

<template>
  <div class="sources-toggle" @click="open = !open">
    <span>📚</span>
    <span v-if="!open" class="toggle-label">Sources</span>
  </div>

  <Transition name="slide">
    <div v-if="open" class="sources-panel">
      <div class="sources-header">
        <h3>Sources & Méthodologie</h3>
        <button class="close-btn" @click="open = false">✕</button>
      </div>

      <div class="sources-body">
        <div
          v-for="l in layersWithMetadata"
          :key="l.id"
          class="source-entry"
        >
          <div class="source-layer-name">
            <span class="source-dot" :class="l.category ?? 'default'"></span>
            {{ l.name }}
          </div>
          <div class="source-citation" v-html="formatCitation(l)"></div>
          <div v-if="l.metadata!.methodology" class="source-method">
            <strong>Méthodologie :</strong> {{ l.metadata!.methodology }}
          </div>
          <div v-if="l.metadata!.notes" class="source-notes">
            <strong>Notes :</strong> {{ l.metadata!.notes }}
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sources-toggle {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 1001;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  padding: 6px 10px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background 0.15s;
}

.sources-toggle:hover {
  background: #f0f0f0;
}

.toggle-label {
  font-weight: 500;
  color: #444;
}

.sources-panel {
  position: absolute;
  bottom: 48px;
  left: 12px;
  z-index: 1001;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
  width: 420px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  font-size: 13px;
}

.sources-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.sources-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.close-btn {
  border: none;
  background: none;
  font-size: 16px;
  color: #999;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.sources-body {
  overflow-y: auto;
  padding: 12px 16px;
}

.source-entry {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.source-entry:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.source-layer-name {
  font-weight: 600;
  font-size: 13px;
  color: #333;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.source-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.source-dot.statistics { background: #2c7fb8; }
.source-dot.infrastructure { background: #e67e22; }
.source-dot.poi { background: #27ae60; }
.source-dot.transport { background: #8e44ad; }
.source-dot.default { background: #95a5a6; }

.source-citation {
  color: #555;
  line-height: 1.5;
  margin-bottom: 4px;
}

.source-citation :deep(em) {
  font-style: italic;
}

.source-citation :deep(a) {
  color: #2c7fb8;
  word-break: break-all;
}

.source-method,
.source-notes {
  color: #666;
  font-size: 12px;
  line-height: 1.4;
  margin-top: 4px;
}

.source-notes {
  color: #888;
  font-style: italic;
}

/* Transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

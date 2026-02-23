<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { searchIndex, buildSearchIndex, type SearchEntry } from '@/composables/useDataStore'

const { t } = useI18n()

const emit = defineEmits<{
  select: [entry: SearchEntry]
}>()

const query = ref('')
const focused = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)
const selectedIdx = ref(-1)

const results = computed(() => {
  if (!query.value || query.value.length < 2) return []
  const q = query.value.toLowerCase()
  const matches = searchIndex.value.filter(e =>
    e.label.toLowerCase().includes(q)
  )
  // Prioritize communes, then sort alphabetically, limit to 8
  matches.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'commune' ? -1 : 1
    return a.label.localeCompare(b.label)
  })
  return matches.slice(0, 8)
})

function selectResult(entry: SearchEntry) {
  emit('select', entry)
  query.value = ''
  focused.value = false
  inputEl.value?.blur()
}

function onBlur() {
  globalThis.setTimeout(() => { focused.value = false }, 200)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIdx.value = Math.min(selectedIdx.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIdx.value = Math.max(selectedIdx.value - 1, -1)
  } else if (e.key === 'Enter' && selectedIdx.value >= 0) {
    e.preventDefault()
    selectResult(results.value[selectedIdx.value])
  } else if (e.key === 'Escape') {
    focused.value = false
    inputEl.value?.blur()
  }
}

// Global keyboard shortcut: Ctrl+K or /
function onGlobalKey(e: KeyboardEvent) {
  if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))) {
    e.preventDefault()
    focused.value = true
    inputEl.value?.focus()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalKey)
  // Build index in background
  buildSearchIndex()
})

onUnmounted(() => {
  document.removeEventListener('keydown', onGlobalKey)
})
</script>

<template>
  <div class="search-bar" :class="{ focused }">
    <div class="search-input-wrap">
      <span class="search-icon">🔍</span>
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        :placeholder="t('searchBar.placeholder')"
        class="search-input"
        @focus="focused = true"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <kbd v-if="!focused" class="shortcut-hint">/</kbd>
    </div>

    <Transition name="dropdown">
      <div v-if="focused && results.length" class="dropdown">
        <button
          v-for="(entry, i) in results"
          :key="i"
          :class="['result-item', { selected: i === selectedIdx }]"
          @mousedown.prevent="selectResult(entry)"
          @mouseover="selectedIdx = i"
        >
          <span class="result-type">{{ entry.type === 'commune' ? '🏘️' : '📍' }}</span>
          <span class="result-label">{{ entry.label }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.search-bar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1002;
  width: 320px;
  max-width: calc(100vw - 340px);
  font-family: system-ui, sans-serif;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  padding: 0 10px;
  transition: box-shadow 0.2s;
}

.search-bar.focused .search-input-wrap {
  box-shadow: 0 2px 12px rgba(44,127,184,0.3);
}

.search-icon {
  font-size: 14px;
  margin-right: 6px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  font-size: 13px;
  padding: 8px 0;
  outline: none;
  background: transparent;
}

.shortcut-hint {
  font-size: 11px;
  padding: 1px 5px;
  border: 1px solid #ddd;
  border-radius: 3px;
  color: #999;
  background: #f5f5f5;
  font-family: monospace;
}

.dropdown {
  margin-top: 4px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  overflow: hidden;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  color: #333;
}

.result-item:hover,
.result-item.selected {
  background: #e3f2fd;
}

.result-type {
  font-size: 14px;
  flex-shrink: 0;
}

.result-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 600px) {
  .search-bar {
    width: calc(100vw - 24px);
    max-width: none;
  }
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SourcesBlock, SourceItem } from '../../types/report'
import { resolveL10n } from '@/lib/l10n'

const { t, locale } = useI18n()

const props = defineProps<{
  block: SourcesBlock
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'update', block: SourcesBlock): void
}>()

const showAddForm = ref(false)
const newLabel = ref('')
const newUrl = ref('')
const newDate = ref('')
const newDescription = ref('')

const sortedItems = computed(() => {
  const items = [...props.block.items]
  // Data sources first, then external
  items.sort((a, b) => {
    if (a.type === b.type) {
      const la = typeof a.label === 'string' ? a.label : a.label.fr
      const lb = typeof b.label === 'string' ? b.label : b.label.fr
      return la.localeCompare(lb, 'fr')
    }
    return a.type === 'data' ? -1 : 1
  })
  return items
})

const dataSources = computed(() => sortedItems.value.filter(s => s.type === 'data'))
const externalSources = computed(() => sortedItems.value.filter(s => s.type === 'external'))

function addSource() {
  if (!newLabel.value.trim()) return
  const item: SourceItem = {
    label: newLabel.value.trim(),
    type: 'external',
    ...(newUrl.value.trim() && { url: newUrl.value.trim() }),
    ...(newDate.value.trim() && { date: newDate.value.trim() }),
    ...(newDescription.value.trim() && { description: newDescription.value.trim() }),
  }
  emit('update', {
    ...props.block,
    items: [...props.block.items, item],
  })
  resetForm()
}

function removeSource(index: number) {
  const items = [...props.block.items]
  items.splice(index, 1)
  emit('update', { ...props.block, items })
}

function resetForm() {
  showAddForm.value = false
  newLabel.value = ''
  newUrl.value = ''
  newDate.value = ''
  newDescription.value = ''
}
</script>

<template>
  <div class="sources-block">
    <h3 v-if="block.title" class="sources-title">{{ resolveL10n(block.title, locale) }}</h3>

    <!-- Data sources section -->
    <div v-if="dataSources.length" class="sources-section">
      <h4 class="sources-subtitle">{{ t('sourcesBlock.dataUsed') }}</h4>
      <ol class="sources-list data-list">
        <li v-for="(src, i) in dataSources" :key="'d-' + i" class="source-item data-source">
          <span class="source-label">{{ resolveL10n(src.label, locale) }}</span>
          <span v-if="src.date" class="source-date"> ({{ src.date }})</span>
          <a v-if="src.url" :href="src.url" target="_blank" rel="noopener" class="source-link">↗</a>
          <span v-if="src.description" class="source-desc"> — {{ resolveL10n(src.description, locale) }}</span>
          <button v-if="editable" class="remove-btn" :title="t('sourcesBlock.delete')" @click="removeSource(block.items.indexOf(src))">×</button>
        </li>
      </ol>
    </div>

    <!-- External sources section -->
    <div v-if="externalSources.length" class="sources-section">
      <h4 class="sources-subtitle">{{ t('sourcesBlock.externalRefs') }}</h4>
      <ol class="sources-list ext-list">
        <li v-for="(src, i) in externalSources" :key="'e-' + i" class="source-item ext-source">
          <span class="source-label">{{ resolveL10n(src.label, locale) }}</span>
          <span v-if="src.date" class="source-date"> ({{ src.date }})</span>
          <a v-if="src.url" :href="src.url" target="_blank" rel="noopener" class="source-link">↗</a>
          <span v-if="src.description" class="source-desc"> — {{ resolveL10n(src.description, locale) }}</span>
          <button v-if="editable" class="remove-btn" :title="t('sourcesBlock.delete')" @click="removeSource(block.items.indexOf(src))">×</button>
        </li>
      </ol>
    </div>

    <!-- Empty state -->
    <p v-if="!dataSources.length && !externalSources.length" class="sources-empty">
      {{ t('sourcesBlock.noSources') }}
    </p>

    <!-- Add form (editable mode) -->
    <div v-if="editable" class="add-section">
      <button v-if="!showAddForm" class="add-source-btn" @click="showAddForm = true">
        {{ t('sourcesBlock.addSource') }}
      </button>
      <div v-else class="add-form">
        <input v-model="newLabel" :placeholder="t('sourcesBlock.labelPlaceholder')" class="form-input" />
        <input v-model="newUrl" :placeholder="t('sourcesBlock.urlPlaceholder')" class="form-input" />
        <input v-model="newDate" :placeholder="t('sourcesBlock.datePlaceholder')" class="form-input" />
        <input v-model="newDescription" :placeholder="t('sourcesBlock.descriptionPlaceholder')" class="form-input" />
        <div class="add-form-actions">
          <button class="btn-confirm" @click="addSource">{{ t('common.add') }}</button>
          <button class="btn-cancel" @click="resetForm">{{ t('common.cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sources-block {
  margin: 1.5rem 0;
  padding: 1rem 1.25rem;
  background: var(--bg-muted, #f8f9fa);
  border-radius: 8px;
  border-left: 4px solid var(--accent, #1976d2);
}

.sources-title {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
  color: var(--text-primary, #222);
}

.sources-subtitle {
  margin: 0.75rem 0 0.35rem;
  font-size: 0.95rem;
  color: var(--text-secondary, #555);
  font-weight: 600;
}

.sources-list {
  margin: 0 0 0.5rem;
  padding-left: 1.5rem;
}

.source-item {
  margin-bottom: 0.35rem;
  line-height: 1.5;
  font-size: 0.9rem;
}

.source-label {
  font-weight: 600;
}

.source-date {
  color: var(--text-secondary, #888);
  font-size: 0.85em;
}

.source-link {
  color: var(--accent, #1976d2);
  text-decoration: none;
  margin-left: 0.25rem;
}

.source-link:hover {
  text-decoration: underline;
}

.source-desc {
  color: var(--text-secondary, #666);
  font-size: 0.88em;
}

.data-source .source-label {
  color: var(--accent, #1976d2);
}

.ext-source .source-label {
  color: var(--text-primary, #333);
}

.sources-empty {
  font-style: italic;
  color: var(--text-secondary, #888);
  margin: 0.5rem 0;
}

/* Editable controls */
.remove-btn {
  background: none;
  border: none;
  color: #c62828;
  cursor: pointer;
  font-size: 1.1rem;
  margin-left: 0.25rem;
  padding: 0 0.25rem;
  line-height: 1;
}

.remove-btn:hover {
  background: rgba(198, 40, 40, 0.1);
  border-radius: 4px;
}

.add-section {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border, #e0e0e0);
}

.add-source-btn {
  background: none;
  border: 1px dashed var(--accent, #1976d2);
  color: var(--accent, #1976d2);
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.add-source-btn:hover {
  background: rgba(25, 118, 210, 0.05);
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-input {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border, #ccc);
  border-radius: 4px;
  font-size: 0.9rem;
}

.add-form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.btn-confirm {
  background: var(--accent, #1976d2);
  color: #fff;
  border: none;
  padding: 0.35rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-cancel {
  background: none;
  border: 1px solid var(--border, #ccc);
  padding: 0.35rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}
</style>

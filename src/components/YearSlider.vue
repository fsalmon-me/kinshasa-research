<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  years: string[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const idx = computed(() => props.years.indexOf(props.modelValue))

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', props.years[+target.value])
}
</script>

<template>
  <div class="year-slider">
    <span class="year-label">{{ modelValue }}</span>
    <input
      type="range"
      :min="0"
      :max="years.length - 1"
      :value="idx"
      :step="1"
      @input="onInput"
    />
    <div class="year-ticks">
      <span v-for="y in years" :key="y" :class="{ active: y === modelValue }">{{ y }}</span>
    </div>
  </div>
</template>

<style scoped>
.year-slider {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 220px;
}

.year-label {
  font-weight: 700;
  font-size: 16px;
  color: #2c7fb8;
}

input[type="range"] {
  width: 100%;
  accent-color: #2c7fb8;
}

.year-ticks {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 11px;
  color: #888;
}

.year-ticks .active {
  color: #2c7fb8;
  font-weight: 600;
}
</style>

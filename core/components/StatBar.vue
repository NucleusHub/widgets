<script setup>
import { computed } from 'vue'

const props = defineProps({
  label:   { type: String, required: true },
  value:   { type: Number, required: true }, // 0–100, drives the bar width
  display: { type: String, default: null },   // text shown on the right (falls back to `${value}%`)
  color:   { type: String, default: '#818cf8' },
})

const pct = computed(() => Math.min(100, Math.max(0, props.value)))
</script>

<template>
  <div class="bar-row">
    <div class="bar-top">
      <span class="bar-label">{{ label }}</span>
      <span class="bar-val">{{ display ?? `${Math.round(value)}%` }}</span>
    </div>
    <div class="bar-track">
      <div class="bar-fill" :style="{ width: pct + '%', background: color, color }" />
    </div>
  </div>
</template>

<style scoped>
.bar-row { display: flex; flex-direction: column; gap: 4px; }
.bar-top { display: flex; justify-content: space-between; align-items: baseline; font-size: 11px; }
.bar-label { color: var(--stat-dim, rgba(255, 255, 255, 0.55)); }
.bar-val { color: var(--stat-text, #fff); font-weight: 600; font-variant-numeric: tabular-nums; }
.bar-track { height: 5px; border-radius: 3px; background: var(--stat-track, rgba(255, 255, 255, 0.09)); overflow: hidden; }
.bar-fill { height: 100%; border-radius: 3px; box-shadow: 0 0 10px currentColor; transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
</style>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  pct:   { type: Number, required: true }, // 0–100
  color: { type: String, default: '#818cf8' },
  label: { type: String, default: '' },
  size:  { type: Number, default: 92 },
})

const R = 34
const C = 2 * Math.PI * R
const offset = computed(() => C * (1 - Math.min(1, Math.max(0, props.pct / 100))))
</script>

<template>
  <div class="ring-wrap">
    <svg :width="size" :height="size" viewBox="0 0 80 80">
      <circle class="ring-track" cx="40" cy="40" :r="R" fill="none" stroke-width="7" />
      <circle
        cx="40" cy="40" :r="R" fill="none" :stroke="color" stroke-width="7" stroke-linecap="round"
        :stroke-dasharray="C" :stroke-dashoffset="offset" transform="rotate(-90 40 40)" class="ring-prog"
      />
      <text x="40" y="37" text-anchor="middle" class="ring-pct">{{ Math.round(pct) }}%</text>
      <text v-if="label" x="40" y="51" text-anchor="middle" class="ring-label">{{ label }}</text>
    </svg>
  </div>
</template>

<style scoped>
.ring-wrap { display: flex; justify-content: center; }
.ring-track { stroke: var(--stat-track, rgba(255, 255, 255, 0.1)); }
.ring-prog { transition: stroke-dashoffset 0.7s cubic-bezier(0.2, 0.8, 0.2, 1); filter: drop-shadow(0 0 4px currentColor); }
.ring-pct { fill: var(--stat-text, #fff); font-size: 16px; font-weight: 700; }
.ring-label { fill: var(--stat-dim, rgba(255, 255, 255, 0.45)); font-size: 8px; letter-spacing: 0.08em; text-transform: uppercase; }
</style>

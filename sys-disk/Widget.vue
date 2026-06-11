<script setup>
import StatTile from '../core/components/StatTile.vue'
import StatRing from '../core/components/StatRing.vue'
import { useSysInfo } from '@/composables/useSysInfo.js'

defineProps({ size: { type: String, default: 'small' }, dark: { type: Boolean, default: true } })

const { data } = useSysInfo()
</script>

<template>
  <StatTile title="Storage" accent="#38bdf8" :dark="dark">
    <div class="disk">
      <StatRing :pct="data?.disk?.percent ?? 0" color="#38bdf8" label="used" :size="86" />
      <div class="disk-meta">
        <p class="disk-free">{{ data ? `${data.disk.freeGB} GB` : '—' }}</p>
        <p class="disk-sub">{{ data ? `free of ${data.disk.totalGB} GB` : 'reading…' }}</p>
      </div>
    </div>
  </StatTile>
</template>

<style scoped>
.disk { display: flex; align-items: center; gap: 12px; }
.disk-meta { min-width: 0; }
.disk-free { font-size: 18px; font-weight: 700; color: var(--stat-text, #fff); line-height: 1.1; }
.disk-sub { font-size: 11px; color: var(--stat-dim, rgba(255, 255, 255, 0.45)); margin-top: 2px; }
</style>

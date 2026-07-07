<script setup>
import { computed } from 'vue'
import StatTile from '../core/components/StatTile.vue'
import StatBar from '../core/components/StatBar.vue'
import { useSysInfo } from '../core/composables/useSysInfo.js'

defineProps({ size: { type: String, default: 'small' }, dark: { type: Boolean, default: true } })

const { data } = useSysInfo()

const uptime = computed(() => {
  const s = data.value?.uptime
  if (s == null) return '—'
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  return `${d}d ${String(h).padStart(2, '0')}h`
})
</script>

<template>
  <StatTile title="System Load" accent="#818cf8" :dark="dark">
    <template #meta>{{ data ? 'live' : '…' }}</template>
    <StatBar
      label="CPU"
      :value="data?.cpu?.load ?? 0"
      :display="`${Math.round(data?.cpu?.load ?? 0)}%`"
      color="#818cf8"
    />
    <StatBar
      label="RAM"
      :value="data?.mem?.percent ?? 0"
      :display="data ? `${data.mem.usedGB} / ${data.mem.totalGB} GB` : '—'"
      color="#34d399"
    />
    <StatBar
      label="GPU"
      :value="data?.gpu?.load ?? 0"
      :display="data?.gpu ? `${Math.round(data.gpu.load)}%` : 'n/a'"
      color="#f472b6"
    />
    <div class="load-foot">
      <span>Uptime</span>
      <span class="load-up">{{ uptime }}</span>
    </div>
  </StatTile>
</template>

<style scoped>
.load-foot {
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 11px; color: var(--stat-dim, rgba(255, 255, 255, 0.45));
  padding-top: 2px; border-top: 1px solid var(--stat-track, rgba(255, 255, 255, 0.07));
}
.load-up { color: var(--stat-text, #fff); font-weight: 600; font-variant-numeric: tabular-nums; }
</style>

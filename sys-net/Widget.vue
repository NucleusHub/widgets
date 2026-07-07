<script setup>
import StatTile from '../core/components/StatTile.vue'
import StatBar from '../core/components/StatBar.vue'
import { useSysInfo } from '../core/composables/useSysInfo.js'

defineProps({ size: { type: String, default: 'small' }, dark: { type: Boolean, default: true } })

const { data } = useSysInfo()

// Throughput mapped onto the bar scale against a 50 MB/s ceiling.
const scale = (mbps) => ((mbps ?? 0) / 50) * 100
// Adaptive units — idle traffic is KB/s, not MB/s.
const rate = (mbps) => {
  const v = mbps ?? 0
  if (v < 1) return `${Math.round(v * 1000)} KB/s`
  return `${v.toFixed(1)} MB/s`
}
</script>

<template>
  <StatTile title="Network" accent="#34d399" :dark="dark">
    <template #meta>{{ data?.net?.iface ?? 'eth0' }}</template>
    <StatBar label="↓ Down" :value="scale(data?.net?.downMBs)" :display="rate(data?.net?.downMBs)" color="#34d399" />
    <StatBar label="↑ Up" :value="scale(data?.net?.upMBs)" :display="rate(data?.net?.upMBs)" color="#60a5fa" />
    <div class="net-foot">
      <span>Local IP</span>
      <span class="net-up">{{ data?.net?.localIp ?? '—' }}</span>
    </div>
  </StatTile>
</template>

<style scoped>
.net-foot {
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 11px; color: var(--stat-dim, rgba(255, 255, 255, 0.45));
  padding-top: 2px; border-top: 1px solid var(--stat-track, rgba(255, 255, 255, 0.07));
}
.net-up { color: var(--stat-text, #fff); font-weight: 600; font-variant-numeric: tabular-nums; }
</style>

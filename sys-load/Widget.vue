<script setup>
import StatTile from '../core/components/StatTile.vue'
import StatBar from '../core/components/StatBar.vue'
import { useSysInfo } from '@/composables/useSysInfo.js'

defineProps({ size: { type: String, default: 'small' }, dark: { type: Boolean, default: true } })

const { data } = useSysInfo()
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
  </StatTile>
</template>

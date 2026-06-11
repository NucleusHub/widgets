<script setup>
import { computed } from 'vue'
import StatTile from '../core/components/StatTile.vue'
import StatBar from '../core/components/StatBar.vue'
import { useSysInfo } from '@/composables/useSysInfo.js'

defineProps({ size: { type: String, default: 'small' }, dark: { type: Boolean, default: true } })

const { data } = useSysInfo()

// Map a temperature (°C) onto the 0–100 bar scale over a sensible range.
const scale = (t) => (((t ?? 0) - 30) / 65) * 100
const label = (t) => (t == null ? 'n/a' : `${Math.round(t)}°C`)

const cpu = computed(() => data.value?.temp?.cpuC ?? null)
const gpu = computed(() => data.value?.gpu?.tempC ?? null)
const max = computed(() => data.value?.temp?.maxC ?? null)
</script>

<template>
  <StatTile title="Temperatures" accent="#fb923c" :dark="dark">
    <StatBar label="CPU" :value="scale(cpu)" :display="label(cpu)" color="#fbbf24" />
    <StatBar label="GPU" :value="scale(gpu)" :display="label(gpu)" color="#22d3ee" />
    <StatBar label="Max" :value="scale(max)" :display="label(max)" color="#a78bfa" />
  </StatTile>
</template>

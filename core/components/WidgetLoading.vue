<template>
  <div class="widget-loading">
    <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"
              stroke-dasharray="31.4" stroke-dashoffset="10" />
    </svg>
    <span>{{ message }}</span>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: 'Connecting…' },
})
</script>

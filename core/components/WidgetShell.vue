<script setup>
import { ref } from 'vue'
import { useWidgetVisibility } from '../composables/useWidgetVisibility.js'

const props = defineProps({
  widgetId:   { type: String, required: true },
  widgetName: { type: String, default: 'widget' },
})

const { hide } = useWidgetVisibility()
const hovered = ref(false)
</script>

<template>
  <div class="relative" @mouseenter="hovered = true" @mouseleave="hovered = false">
    <slot />
    <Transition name="ws-fade">
      <button
        v-if="hovered"
        class="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-black/50 text-white/70 hover:bg-black/70 hover:text-white flex items-center justify-center transition-colors"
        :title="`Hide ${widgetName}`"
        @click.stop="hide(widgetId)"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.ws-fade-enter-active, .ws-fade-leave-active { transition: opacity 0.15s; }
.ws-fade-enter-from, .ws-fade-leave-to { opacity: 0; }
</style>

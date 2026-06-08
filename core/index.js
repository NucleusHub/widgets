// Composables
export { usePoller }            from './composables/usePoller.js'
export { useApiRequest }        from './composables/useApiRequest.js'
export { useWidgetState }       from './composables/useWidgetState.js'
export { useWidgetVisibility }  from './composables/useWidgetVisibility.js'

// Utils
export { formatDuration } from './utils/time.js'
export { createApiClient } from './utils/api.js'

// Components — import via 'core/components/Foo.vue' for tree-shaking,
// or re-export here for convenience.
export { default as WidgetCard }    from './components/WidgetCard.vue'
export { default as WidgetLoading } from './components/WidgetLoading.vue'
export { default as WidgetStatus }  from './components/WidgetStatus.vue'
export { default as WidgetShell }   from './components/WidgetShell.vue'

import { defineAsyncComponent } from 'vue'

// Shared widget component resolver. Lives in the widget core package so any app
// (not just the hub) can render a widget by id — the cross-app overlay host uses
// this. The globs are relative to this file: `../*/Widget.vue` matches every
// sibling widget package (widgets/<id>/Widget.vue). Vite discovers them at build
// time, so adding a widget package needs no change here.
//
// The hub keeps its own resolver in hub/src/composables/useWidgets.js (same
// globs, via its @widgets-core symlink) — this module is the shared equivalent
// for the other apps, which bundle the widget package through @widgets-core.
const widgetModules = import.meta.glob('../*/Widget.vue')
const configModules = import.meta.glob('../*/Config.vue')

const cache = {}
const configCache = {}

export function resolveWidget(id) {
  if (cache[id]) return cache[id]
  const key = `../${id}/Widget.vue`
  if (!widgetModules[key]) return null
  cache[id] = defineAsyncComponent(widgetModules[key])
  return cache[id]
}

export function resolveWidgetConfig(id) {
  if (configCache[id]) return configCache[id]
  const key = `../${id}/Config.vue`
  if (!configModules[key]) return null
  configCache[id] = defineAsyncComponent(configModules[key])
  return configCache[id]
}

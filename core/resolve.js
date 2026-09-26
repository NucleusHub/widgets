import { defineAsyncComponent } from 'vue'

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

import { ref } from 'vue'

const STORAGE_KEY = 'nucleus:hidden-widgets'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

// Module-level singleton so all callers share the same reactive state
const hiddenIds = ref(new Set(load()))

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...hiddenIds.value]))
}

export function useWidgetVisibility() {
  function hide(id) {
    hiddenIds.value = new Set([...hiddenIds.value, id])
    save()
  }

  function show(id) {
    const s = new Set(hiddenIds.value)
    s.delete(id)
    hiddenIds.value = s
    save()
  }

  return { hiddenIds, hide, show }
}

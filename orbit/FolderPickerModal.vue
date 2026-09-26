<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  show:      { type: Boolean, default: false },
  currentId: { type: String, default: null },
})
const emit = defineEmits(['select', 'cancel'])

const folders   = ref([])
const collapsed = ref(new Set())
const loading   = ref(false)
const error     = ref(null)

function onKeydown(e) { if (e.key === 'Escape') emit('cancel') }

watch(() => props.show, async (val) => {
  if (!val) { window.removeEventListener('keydown', onKeydown); return }
  window.addEventListener('keydown', onKeydown)
  collapsed.value = new Set()
  error.value = null
  loading.value = true
  try {
    const res = await fetch('/api/orbit/folders/all', { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    folders.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const flatTree = computed(() => {
  const result = []
  function walk(parentId, depth) {
    folders.value
      .filter(f => String(f.parentId || null) === String(parentId || null))
      .forEach(f => {
        const id = String(f._id)
        const hasChildren = folders.value.some(c => String(c.parentId || null) === id)
        result.push({ ...f, depth, hasChildren, isCollapsed: collapsed.value.has(id) })
        if (!collapsed.value.has(id)) walk(f._id, depth + 1)
      })
  }
  walk(null, 0)
  return result
})

function toggle(id) {
  const s = new Set(collapsed.value)
  s.has(id) ? s.delete(id) : s.add(id)
  collapsed.value = s
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fp-fade">
      <div v-if="show" class="fixed inset-0 z-[210] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-xl" @click="$emit('cancel')" />
        <div class="relative bg-white/95 dark:bg-slate-900/95 border border-white/50 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden" style="max-height: 75vh">
          <div class="px-5 pt-5 pb-4 border-b border-slate-200/70 dark:border-white/8 shrink-0">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Choose a folder</h2>
          </div>

          <div class="flex-1 overflow-y-auto py-2 min-h-0">
            <div v-if="loading" class="flex items-center justify-center py-8">
              <svg class="w-5 h-5 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div v-else-if="error" class="px-5 py-4 text-sm text-red-500">Failed to load folders: {{ error }}</div>

            <template v-else>
              <button
                class="w-full flex items-center gap-2 px-4 py-2 text-sm cursor-pointer transition-colors"
                :class="currentId === null
                  ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/6'"
                @click="$emit('select', { id: null, name: 'Home' })"
              >
                <svg class="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
                </svg>
                <span class="font-medium">Home</span>
              </button>

              <div
                v-for="folder in flatTree"
                :key="folder._id"
                class="flex items-center gap-1 pr-4 py-0.5"
                :style="{ paddingLeft: `${(folder.depth + 1) * 16 + 4}px` }"
              >
                <button
                  v-if="folder.hasChildren"
                  class="cursor-pointer p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
                  @click.stop="toggle(String(folder._id))"
                >
                  <svg class="w-3 h-3 transition-transform" :class="folder.isCollapsed ? '' : 'rotate-90'" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
                <span v-else class="w-4 shrink-0" />

                <button
                  class="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer text-left transition-colors"
                  :class="String(currentId) === String(folder._id)
                    ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/6'"
                  @click="$emit('select', { id: String(folder._id), name: folder.name })"
                >
                  <svg class="w-4 h-4 shrink-0 text-indigo-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44z" />
                  </svg>
                  <span class="truncate">{{ folder.name }}</span>
                </button>
              </div>

              <p v-if="!flatTree.length" class="px-5 py-4 text-sm text-slate-400 dark:text-slate-500">No folders yet</p>
            </template>
          </div>

          <div class="px-5 py-4 border-t border-slate-200/70 dark:border-white/8 flex justify-end shrink-0">
            <button
              @click="$emit('cancel')"
              class="cursor-pointer px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >Cancel</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fp-fade-enter-active, .fp-fade-leave-active { transition: opacity 0.15s ease; }
.fp-fade-enter-from, .fp-fade-leave-to { opacity: 0; }
</style>

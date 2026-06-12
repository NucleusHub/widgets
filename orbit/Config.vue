<script setup>
import { ref, watch } from 'vue'
import FolderPickerModal from './FolderPickerModal.vue'

// v-model contract used by the hub's WidgetConfigModal.
// Config shape: { mode: 'recent' | 'folder', folderId: string|null, folderName: string|null }
const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])

const mode       = ref(props.modelValue.mode === 'folder' ? 'folder' : 'recent')
const folderId   = ref(props.modelValue.folderId ?? null)
const folderName = ref(props.modelValue.folderName ?? null)

const pickerOpen = ref(false)

watch([mode, folderId, folderName], () => {
  emit('update:modelValue', {
    mode: mode.value,
    folderId: folderId.value,
    folderName: folderName.value,
  })
})

function onPick({ id, name }) {
  folderId.value = id
  folderName.value = name
  pickerOpen.value = false
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Mode -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Show</p>
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer"
          :class="mode === 'recent'
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
          @click="mode = 'recent'"
        >Recent files</button>
        <button
          type="button"
          class="px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer"
          :class="mode === 'folder'
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
          @click="mode = 'folder'"
        >Specific folder</button>
      </div>
    </div>

    <!-- Folder picker (folder mode only) -->
    <div v-if="mode === 'folder'">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Folder</p>
      <button
        type="button"
        class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
        @click="pickerOpen = true"
      >
        <svg class="w-4 h-4 shrink-0 text-indigo-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44z" />
        </svg>
        <span class="flex-1 text-left truncate">{{ folderName || 'Choose a folder…' }}</span>
        <svg class="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
      <p class="text-xs text-slate-400 dark:text-slate-500 mt-2">Shows the folder's subfolders and files (one level).</p>
    </div>

    <FolderPickerModal
      :show="pickerOpen"
      :current-id="folderId"
      @select="onPick"
      @cancel="pickerOpen = false"
    />
  </div>
</template>

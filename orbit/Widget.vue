<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  size:   { type: String, default: 'medium' },
  dark:   { type: Boolean, default: true },
  config: { type: Object, default: () => ({}) },
})

const mode     = computed(() => props.config?.mode === 'folder' ? 'folder' : 'recent')
const folderId = computed(() => props.config?.folderId ?? null)

// ROW_H must match the .ow-row height in CSS.
const ROW_H = 46
const VISIBLE_ROWS = { small: 2.5, medium: 3.5, large: 5.5 }
const bodyHeight = computed(() => Math.round((VISIBLE_ROWS[props.size] ?? VISIBLE_ROWS.medium) * ROW_H))

const FETCH_LIMIT = 25
const MAX_ITEMS = 50

const status = ref('loading')
const items  = ref([])

const subtitle = computed(() => {
  if (mode.value === 'folder') return props.config?.folderName || 'Folder'
  return 'Recent files'
})

function formatBytes(bytes) {
  if (bytes == null) return ''
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function fileMeta(it) {
  const parts = []
  if (mode.value === 'recent') parts.push(it.path && it.path.length ? it.path.join(' / ') : 'Home')
  const s = formatBytes(it.size)
  if (s) parts.push(s)
  return parts.join('  ·  ')
}

async function load() {
  try {
    if (mode.value === 'folder' && !folderId.value) {
      items.value = []
      status.value = 'ready'
      return
    }
    let next
    if (mode.value === 'folder') {
      const res = await fetch(`/api/orbit/folders/browse?parentId=${folderId.value}`, { credentials: 'include' })
      if (res.status === 401) { status.value = 'locked'; return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      next = [
        ...data.folders.map(f => ({ type: 'folder', id: f._id, name: f.name, folderId: f._id })),
        ...data.files.map(f => ({ type: 'file', id: f._id, name: f.filename, folderId: folderId.value, size: f.size, path: null })),
      ].slice(0, MAX_ITEMS)
    } else {
      const res = await fetch(`/api/orbit/files/recent?limit=${FETCH_LIMIT}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const files = await res.json()
      next = files.map(f => ({ type: 'file', id: f._id, name: f.filename, folderId: f.folderId, size: f.size, path: f.path }))
    }
    items.value = next
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
}

function open(item) {
  if (item.type === 'folder') {
    window.location.href = `/orbit/?folder=${item.id}`
  } else {
    const f = item.folderId ? `folder=${item.folderId}&` : ''
    window.location.href = `/orbit/?${f}highlight=${item.id}`
  }
}

let timer = null
onMounted(() => {
  load()
  timer = setInterval(load, 15000)
})
onUnmounted(() => clearInterval(timer))
watch([mode, folderId], () => { status.value = 'loading'; load() })
</script>

<template>
  <div class="orbit-w" :class="{ light: !dark }">
    <a class="ow-head" href="/orbit/" title="Open Orbit">
      <span class="ow-logo">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75z" />
        </svg>
      </span>
      <span class="ow-title">Orbit</span>
      <span class="ow-sub">{{ subtitle }}</span>
      <svg class="ow-ext" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </a>

    <div class="ow-body" :style="{ height: bodyHeight + 'px' }">
      <div v-if="status === 'loading'" class="ow-msg">
        <svg class="ow-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-dashoffset="10" />
        </svg>
        Loading…
      </div>

      <div v-else-if="status === 'locked'" class="ow-msg">This folder is protected — open Orbit to unlock.</div>
      <div v-else-if="status === 'error'" class="ow-msg">Couldn't reach Orbit.</div>
      <div v-else-if="!items.length && mode === 'folder' && !folderId" class="ow-msg">Pick a folder in settings.</div>
      <div v-else-if="!items.length" class="ow-msg">No files yet.</div>

      <ul v-else class="ow-list">
        <li v-for="it in items" :key="it.type + it.id">
          <button class="ow-row" :title="it.name" @click="open(it)">
            <span class="ow-icon">
              <svg v-if="it.type === 'folder'" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44z" />
              </svg>
              <svg v-else width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
              </svg>
            </span>
            <span class="ow-text">
              <span class="ow-name">{{ it.name }}</span>
              <span v-if="it.type === 'file'" class="ow-meta">{{ fileMeta(it) }}</span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.orbit-w {
  --ow-bg: rgba(12, 12, 24, 0.82);
  --ow-border: rgba(255, 255, 255, 0.09);
  --ow-shadow: 0 14px 44px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255, 255, 255, 0.04) inset;
  --ow-text: #fff;
  --ow-dim: rgba(255, 255, 255, 0.5);
  --ow-hover: rgba(255, 255, 255, 0.07);
  --ow-accent: #818cf8;
  --ow-scroll: rgba(255, 255, 255, 0.18);

  width: 100%;
  background: var(--ow-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--ow-border);
  border-radius: 16px;
  box-shadow: var(--ow-shadow);
  color: var(--ow-text);
  overflow: hidden;
  line-height: normal;
}
.orbit-w.light {
  --ow-bg: rgba(255, 255, 255, 0.74);
  --ow-border: rgba(15, 23, 42, 0.1);
  --ow-shadow: 0 14px 44px rgba(15, 23, 42, 0.16), 0 0 0 0.5px rgba(255, 255, 255, 0.7) inset;
  --ow-text: #0f172a;
  --ow-dim: rgba(15, 23, 42, 0.5);
  --ow-hover: rgba(15, 23, 42, 0.05);
  --ow-scroll: rgba(15, 23, 42, 0.2);
}

.ow-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 13px;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--ow-border);
}
.ow-logo { color: var(--ow-accent); display: flex; }
.ow-title { font-size: 13px; font-weight: 700; }
.ow-sub {
  font-size: 11px; color: var(--ow-dim); margin-left: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
}
.ow-ext { color: var(--ow-dim); flex-shrink: 0; }
.ow-head:hover .ow-ext { color: var(--ow-accent); }

.ow-body {
  padding: 4px;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: content-box;
}
.ow-body::-webkit-scrollbar { width: 6px; }
.ow-body::-webkit-scrollbar-thumb { background: var(--ow-scroll); border-radius: 3px; }

.ow-msg {
  height: 100%;
  display: flex; align-items: center; gap: 8px;
  padding: 0 14px; font-size: 12px; color: var(--ow-dim);
  justify-content: center; text-align: center;
}
.ow-spin { animation: ow-spin 1s linear infinite; color: var(--ow-accent); }
@keyframes ow-spin { to { transform: rotate(360deg); } }

.ow-list { list-style: none; margin: 0; padding: 0; }

.ow-row {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 9px;
  border: none;
  background: transparent;
  border-radius: 9px;
  cursor: pointer;
  color: inherit;
  text-align: left;
  transition: background 0.12s;
}
.ow-row:hover { background: var(--ow-hover); }

.ow-icon { color: var(--ow-accent); flex-shrink: 0; display: flex; }
.ow-text { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ow-name {
  font-size: 13px; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ow-meta {
  font-size: 11px; color: var(--ow-dim);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
</style>

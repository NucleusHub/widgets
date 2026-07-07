<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRegistry } from '@core/useRegistry.js'
import { useTheme } from '@core/useTheme.js'
import { resolveWidget } from '../resolve.js'

// Renders Pulse widgets that the user chose to surface inside *this* app. Each
// widget gets a small, always-visible move handle and can be dragged; its
// position is saved PER APP (`appPositions[appId]` in Pulse state), independent
// of the hub-dashboard position and of every other app.
//
// The whole widget system is Pulse-owned: if Pulse isn't installed/enabled for
// this user, hasApp('pulse') is false and this renders nothing at all — no
// fetch, no markup. Mounted once in core/auth/AuthGuard.vue (the component every
// app wraps in), so apps never import widget code themselves. No-op on the hub.

const SIZE_DIMS = { small: 280, medium: 360, large: 480 }
const MOBILE_BREAKPOINT = 768

const { apps, widgets: manifests, loading } = useRegistry()
const { isDark } = useTheme()

// This bundle's app id, from the Vite base path (base '/orbit' → the app whose
// route is '/orbit'). Mirrors core/auth/AuthGuard.vue. Null on the hub (base '/').
const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || '/'
const currentApp = computed(() =>
  basePath === '/' ? null : apps.value.find(a => (a.route || '').replace(/\/+$/, '') === basePath) || null,
)

const pulsePresent = computed(() => apps.value.some(a => a.id === 'pulse'))
const active = computed(() => !!currentApp.value && pulsePresent.value)

const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false)
function onResize() { isMobile.value = window.innerWidth < MOBILE_BREAKPOINT }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', duringDrag)
  window.removeEventListener('mouseup', endDrag)
  clearTimeout(saveTimer)
})

// Full saved widget state (positions, sizes, config, visibility, appPositions).
// Fetched from Pulse only once we know Pulse is present and which app we're in.
const raw = ref([])
let fetched = false
async function fetchState() {
  if (fetched) return
  fetched = true
  try {
    const res = await fetch('/api/pulse/dashboard', { credentials: 'include' })
    if (res.ok) raw.value = (await res.json())?.widgets ?? []
  } catch { /* Pulse unreachable — render nothing */ }
}
watch([active, loading], () => {
  if (active.value && !loading.value) fetchState()
}, { immediate: true })

// Widgets to render here — returns { s, m } where `s` is the LIVE reactive state
// object (so drags mutate it in place) and `m` is its manifest. Manifest-driven:
// the widget must opt into cross-app display and this app must not be blacklisted.
const visibleWidgets = computed(() => {
  if (!active.value || isMobile.value) return []
  const appId = currentApp.value.id
  const mById = new Map(manifests.value.map(m => [m.id, m]))
  const out = []
  for (const s of raw.value) {
    if (s.enabled === false) continue
    const v = s.visibility
    if (!(v?.scope === 'apps' && Array.isArray(v.apps) && v.apps.includes(appId))) continue
    const m = mById.get(s.id) // absent → globally/per-user disabled
    if (!m || m.crossApp !== true || (m.crossAppBlacklist || []).includes(appId)) continue
    out.push({ s, m })
  }
  return out
})

// Effective position in this app: per-app override → hub position → default.
function posOf(s) {
  const appId = currentApp.value?.id
  return (appId && s.appPositions && s.appPositions[appId]) || s.position || { x: 24, y: 24 }
}
function widthOf(s, m) {
  return m?.sizeDims?.[s.size] ?? SIZE_DIMS[s.size] ?? 360
}

// ── Drag (per-app position) ──────────────────────────────────────────────────
const draggingId = ref(null)
let dragOrigin = null

function startDrag(s, e) {
  const p = posOf(s)
  dragOrigin = { id: s.id, mouseX: e.clientX, mouseY: e.clientY, x: p.x, y: p.y }
  draggingId.value = s.id
  window.addEventListener('mousemove', duringDrag)
  window.addEventListener('mouseup', endDrag)
  e.preventDefault()
}
function duringDrag(e) {
  if (!dragOrigin) return
  const appId = currentApp.value?.id
  const s = raw.value.find(x => x.id === dragOrigin.id)
  if (!s || !appId) return
  const nx = Math.max(0, Math.min(dragOrigin.x + e.clientX - dragOrigin.mouseX, window.innerWidth - 40))
  const ny = Math.max(0, Math.min(dragOrigin.y + e.clientY - dragOrigin.mouseY, window.innerHeight - 40))
  if (!s.appPositions) s.appPositions = {}
  s.appPositions[appId] = { x: nx, y: ny }
}
function endDrag() {
  window.removeEventListener('mousemove', duringDrag)
  window.removeEventListener('mouseup', endDrag)
  draggingId.value = null
  dragOrigin = null
  persist()
}

// Persist a widget's own config edits back to Pulse (debounced). Positions and
// everything else are preserved because we write back the whole fetched array.
let saveTimer = null
function onWidgetConfig(id, cfg) {
  const s = raw.value.find(x => x.id === id)
  if (!s) return
  s.config = cfg
  clearTimeout(saveTimer)
  saveTimer = setTimeout(persist, 800)
}
async function persist() {
  try {
    await fetch('/api/pulse/dashboard', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ widgets: raw.value }),
    })
  } catch { /* best-effort */ }
}
</script>

<template>
  <!-- Full-screen, click-through canvas; only the widget cards + handles capture
       pointer events, so the host app stays fully interactive underneath. -->
  <div v-if="visibleWidgets.length" class="fixed inset-0 z-40 pointer-events-none">
    <div
      v-for="{ s, m } in visibleWidgets"
      :key="s.id"
      class="pointer-events-auto"
      :style="{
        position: 'absolute',
        left:  posOf(s).x + 'px',
        top:   posOf(s).y + 'px',
        width: widthOf(s, m) + 'px',
      }"
    >
      <!-- Always-visible move handle (top-left corner) — small Pulse-style grip. -->
      <button
        class="wo-move"
        :class="[isDark ? 'wo-move--dark' : 'wo-move--light', { 'wo-move--active': draggingId === s.id }]"
        title="Drag to move"
        @mousedown="startDrag(s, $event)"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="2" /><circle cx="15" cy="5" r="2" />
          <circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" />
          <circle cx="9" cy="19" r="2" /><circle cx="15" cy="19" r="2" />
        </svg>
      </button>

      <component
        :is="resolveWidget(s.id)"
        v-if="resolveWidget(s.id)"
        :size="s.size"
        :dark="isDark"
        :config="s.config"
        @update:config="onWidgetConfig(s.id, $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.wo-move {
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(-35%, -35%);
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid;
  cursor: grab;
  opacity: 0.8;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  transition: background 0.12s, color 0.12s, opacity 0.12s, transform 0.12s;
}
.wo-move:hover { opacity: 1; }
.wo-move--active,
.wo-move:active { cursor: grabbing; transform: translate(-35%, -35%) scale(1.1); }

.wo-move--dark {
  background: rgba(10, 10, 22, 0.9);
  border-color: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
}
.wo-move--dark:hover { color: #fff; }

.wo-move--light {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(15, 23, 42, 0.12);
  color: rgba(15, 23, 42, 0.6);
}
.wo-move--light:hover { color: rgba(15, 23, 42, 0.9); }
</style>

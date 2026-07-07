<script setup>
import { computed } from 'vue'
import { useRegistry } from '@core/useRegistry.js'

// Shared widget settings modal. Owns the modal chrome, renders the widget's own
// Config.vue (passed in as `configComponent`), and — for widgets whose manifest
// opts in (`crossApp: true`) — adds the built-in "Show in" section that lets the
// user float the widget inside other apps. Everything here is manifest-driven:
// whether the section appears (crossApp) and which apps are offered (installed
// apps minus the widget's `crossAppBlacklist`). No app ids are hardcoded.
//
// Kept free of Pulse/hub imports so it can live in the shared widget package;
// the host app wires state + persistence (see hub/src/components/WidgetConfigModal.vue).
const props = defineProps({
  show:            { type: Boolean, default: false },
  title:           { type: String, default: 'Widget' },
  description:     { type: String, default: '' },
  // The widget's own Config.vue (already resolved), or null when it ships none.
  configComponent: { type: [Object, Function], default: null },
  // The widget's own config object (v-model:config).
  config:          { type: Object, default: () => ({}) },
  // { scope: 'dashboard' | 'apps', apps: string[] } (v-model:visibility).
  visibility:      { type: Object, default: () => ({ scope: 'dashboard', apps: [] }) },
  // From the widget manifest: may it be shown in other apps at all?
  crossApp:        { type: Boolean, default: false },
  // From the widget manifest: app ids it must never be shown in (e.g. the Echo
  // widget on top of the Echo app). Filtered out of the picker entirely.
  blacklist:       { type: Array, default: () => [] },
})
const emit = defineEmits(['update:config', 'update:visibility', 'save', 'cancel'])

const { apps } = useRegistry()

// Apps the widget can be surfaced in: installed + enabled for this user. Apps on
// the manifest blacklist stay listed but are shown disabled ("Blocked by
// manifest") rather than hidden, so it's clear why they can't be chosen. The hub
// dashboard is always implied ("dashboard only"), so it isn't listed here.
const appOptions = computed(() => {
  const banned = new Set(props.blacklist || [])
  return apps.value.map(a => ({ id: a.id, name: a.name || a.id, blocked: banned.has(a.id) }))
})
// Only non-blocked apps can actually be toggled / counted for "select all".
const selectableOptions = computed(() => appOptions.value.filter(o => !o.blocked))

const scope = computed({
  get: () => props.visibility?.scope || 'dashboard',
  set: (v) => emit('update:visibility', { scope: v, apps: props.visibility?.apps || [] }),
})

function isAppOn(id) {
  return (props.visibility?.apps || []).includes(id)
}
function emitApps(list) {
  emit('update:visibility', { scope: props.visibility?.scope || 'apps', apps: list })
}
function toggleApp(id) {
  if ((props.blacklist || []).includes(id)) return // blocked — not toggleable
  const current = new Set(props.visibility?.apps || [])
  if (current.has(id)) current.delete(id)
  else current.add(id)
  emitApps([...current])
}

// "Select all" — resolves to every currently-selectable (non-blocked) app.
const selectedCount = computed(() => selectableOptions.value.filter(o => isAppOn(o.id)).length)
const allSelected = computed(() => selectableOptions.value.length > 0 && selectedCount.value === selectableOptions.value.length)
const someSelected = computed(() => selectedCount.value > 0 && !allSelected.value)
function toggleAll() {
  const selectable = new Set(selectableOptions.value.map(o => o.id))
  if (allSelected.value) {
    // Clear only the selectable ids; leave anything else in the saved list alone.
    emitApps((props.visibility?.apps || []).filter(id => !selectable.has(id)))
  } else {
    const merged = new Set([...(props.visibility?.apps || []), ...selectable])
    emitApps([...merged])
  }
}

// Whether there's anything to show in the body at all.
const hasBody = computed(() => !!props.configComponent || props.crossApp)
</script>

<template>
  <Teleport to="body">
    <Transition name="cfg-fade">
      <div v-if="show" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/20 backdrop-blur-xl" @pointerdown.prevent="emit('cancel')" />
        <div class="relative bg-white/25 dark:bg-white/8 border border-white/50 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style="max-height: 85vh">
          <!-- Header -->
          <div class="px-5 pt-5 pb-4 border-b border-white/30 dark:border-white/10 shrink-0">
            <h2 class="text-base font-semibold text-slate-900 dark:text-white">{{ title }} settings</h2>
            <p v-if="description" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ description }}</p>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-5 py-4 min-h-0 flex flex-col gap-5">
            <!-- The widget's own Config.vue -->
            <component
              :is="configComponent"
              v-if="configComponent"
              :modelValue="config"
              @update:modelValue="emit('update:config', $event)"
            />

            <!-- Built-in "Show in" — only for widgets whose manifest allows it ── -->
            <div v-if="crossApp" class="flex flex-col gap-2.5">
              <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/35">Show in</h3>

              <!-- Dashboard only -->
              <button
                type="button"
                class="text-left rounded-xl border px-3.5 py-2.5 transition-colors cursor-pointer"
                :class="scope === 'dashboard'
                  ? 'border-indigo-500/60 bg-indigo-500/10'
                  : 'border-slate-200 dark:border-white/10 hover:bg-slate-100/60 dark:hover:bg-white/5'"
                @click="scope = 'dashboard'"
              >
                <p class="text-sm font-semibold text-slate-900 dark:text-white">Dashboard only</p>
                <p class="text-xs text-slate-500 dark:text-white/45 mt-0.5">Shown on the hub dashboard, nowhere else.</p>
              </button>

              <!-- Dashboard + other apps -->
              <button
                type="button"
                class="text-left rounded-xl border px-3.5 py-2.5 transition-colors cursor-pointer"
                :class="scope === 'apps'
                  ? 'border-indigo-500/60 bg-indigo-500/10'
                  : 'border-slate-200 dark:border-white/10 hover:bg-slate-100/60 dark:hover:bg-white/5'"
                @click="scope = 'apps'"
              >
                <p class="text-sm font-semibold text-slate-900 dark:text-white">Dashboard &amp; other apps</p>
                <p class="text-xs text-slate-500 dark:text-white/45 mt-0.5">Also floats inside the apps you pick below.</p>
              </button>

              <!-- App picker -->
              <div v-if="scope === 'apps'" class="flex flex-col gap-0.5 pl-1">
                <p v-if="!appOptions.length" class="text-xs text-slate-400 dark:text-white/40 py-1">No other apps are available.</p>

                <template v-else>
                  <!-- Select all -->
                  <label class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/5">
                    <input type="checkbox" class="sr-only peer" :checked="allSelected" @change="toggleAll" />
                    <span
                      class="wc-box"
                      :class="allSelected ? 'wc-on' : someSelected ? 'wc-mixed' : 'wc-off'"
                    >
                      <svg v-if="allSelected" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                      <span v-else-if="someSelected" class="wc-dash" />
                    </span>
                    <span class="text-sm font-semibold text-slate-700 dark:text-white/80">Select all apps</span>
                  </label>

                  <div class="h-px bg-slate-200/60 dark:bg-white/8 mx-2 my-1" />

                  <label
                    v-for="opt in appOptions"
                    :key="opt.id"
                    class="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                    :class="opt.blocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/5'"
                  >
                    <input v-if="!opt.blocked" type="checkbox" class="sr-only peer" :checked="isAppOn(opt.id)" @change="toggleApp(opt.id)" />
                    <span class="wc-box" :class="opt.blocked ? 'wc-blocked' : (isAppOn(opt.id) ? 'wc-on' : 'wc-off')">
                      <svg v-if="opt.blocked" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                      <svg v-else-if="isAppOn(opt.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                    </span>
                    <span class="text-sm" :class="opt.blocked ? 'text-slate-400 dark:text-white/35' : 'text-slate-700 dark:text-white/80'">{{ opt.name }}</span>
                    <span v-if="opt.blocked" class="ml-auto text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-white/30">Blocked by manifest</span>
                  </label>
                </template>
              </div>
            </div>

            <p v-if="!hasBody" class="text-sm text-slate-500 dark:text-slate-400">This widget has no settings.</p>
          </div>

          <!-- Footer -->
          <div class="px-5 py-4 border-t border-white/30 dark:border-white/10 flex gap-2 justify-end shrink-0">
            <button
              @click="emit('cancel')"
              class="cursor-pointer px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >Cancel</button>
            <button
              @click="emit('save')"
              class="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >Save</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cfg-fade-enter-active, .cfg-fade-leave-active { transition: opacity 0.15s ease; }
.cfg-fade-enter-from, .cfg-fade-leave-to { opacity: 0; }

/* Prettier checkbox — soft-rounded square (not a circle), springs on toggle. */
.wc-box {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
}
.wc-box svg { width: 13px; height: 13px; color: #fff; }
.wc-off {
  border-color: rgb(203 213 225);           /* slate-300 */
  background: rgba(255, 255, 255, 0.5);
}
:global(.dark) .wc-off {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.05);
}
.wc-on, .wc-mixed {
  border-color: #6366f1;                     /* indigo-500 */
  background: #6366f1;
}
/* Blacklisted by the widget manifest — visible but not selectable. */
.wc-blocked {
  border-color: rgb(203 213 225);            /* slate-300 */
  background: rgba(148, 163, 184, 0.12);
}
.wc-blocked svg { width: 12px; height: 12px; color: rgb(148 163 184); }  /* slate-400 */
:global(.dark) .wc-blocked {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
}
:global(.dark) .wc-blocked svg { color: rgba(255, 255, 255, 0.3); }
.wc-dash {
  width: 10px;
  height: 2.5px;
  border-radius: 2px;
  background: #fff;
}
/* Keyboard focus ring via the visually-hidden peer input. */
.peer:focus-visible + .wc-box {
  outline: 2px solid rgba(99, 102, 241, 0.6);
  outline-offset: 2px;
}
label:active .wc-box { transform: scale(0.9); }
</style>

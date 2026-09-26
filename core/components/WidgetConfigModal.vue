<script setup>
import { computed } from 'vue'
import { useRegistry } from '@core/useRegistry.js'
import { useAuth } from '@core/auth/useAuth.js'
import TemplateModal from '@core/TemplateModal.vue'

const props = defineProps({
  show:            { type: Boolean, default: false },
  title:           { type: String, default: 'Widget' },
  description:     { type: String, default: '' },
  configComponent: { type: [Object, Function], default: null },
  config:          { type: Object, default: () => ({}) },
  visibility:      { type: Object, default: () => ({ scope: 'dashboard', apps: [] }) },
  crossApp:        { type: Boolean, default: false },
  blacklist:       { type: Array, default: () => [] },
})
const emit = defineEmits(['update:config', 'update:visibility', 'save', 'cancel'])

const { apps } = useRegistry()
const { profile } = useAuth()
const isAdmin = computed(() => profile.value?.role === 'admin')

const appOptions = computed(() => {
  const banned = new Set(props.blacklist || [])
  return apps.value
    .filter(a => a.id !== 'pulse')
    .filter(a => a.id !== 'admin' || isAdmin.value)
    .map(a => ({ id: a.id, name: a.name || a.id, blocked: banned.has(a.id) }))
})
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
  if ((props.blacklist || []).includes(id)) return
  const current = new Set(props.visibility?.apps || [])
  if (current.has(id)) current.delete(id)
  else current.add(id)
  emitApps([...current])
}

const selectedCount = computed(() => selectableOptions.value.filter(o => isAppOn(o.id)).length)
const allSelected = computed(() => selectableOptions.value.length > 0 && selectedCount.value === selectableOptions.value.length)
const someSelected = computed(() => selectedCount.value > 0 && !allSelected.value)
function toggleAll() {
  const selectable = new Set(selectableOptions.value.map(o => o.id))
  if (allSelected.value) {
    emitApps((props.visibility?.apps || []).filter(id => !selectable.has(id)))
  } else {
    const merged = new Set([...(props.visibility?.apps || []), ...selectable])
    emitApps([...merged])
  }
}

const hasBody = computed(() => !!props.configComponent || props.crossApp)
</script>

<template>
  <TemplateModal
    :show="show"
    header
    footer
    size="md"
    :title="`${title} settings`"
    :description="description"
    confirm-label="Save"
    cancel-label="Cancel"
    body-class="px-5 py-4"
    @confirm="emit('save')"
    @cancel="emit('cancel')"
  >
          <div class="flex flex-col gap-5">
            <component
              :is="configComponent"
              v-if="configComponent"
              :modelValue="config"
              @update:modelValue="emit('update:config', $event)"
            />

            <div v-if="crossApp" class="flex flex-col gap-2.5">
              <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/35">Show in</h3>

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

              <div v-if="scope === 'apps'" class="flex flex-col gap-0.5 pl-1">
                <p v-if="!appOptions.length" class="text-xs text-slate-400 dark:text-white/40 py-1">No other apps are available.</p>

                <template v-else>
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
  </TemplateModal>
</template>

<style scoped>
.cfg-fade-enter-active, .cfg-fade-leave-active { transition: opacity 0.15s ease; }
.cfg-fade-enter-from, .cfg-fade-leave-to { opacity: 0; }

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
  border-color: rgb(203 213 225);
  background: rgba(255, 255, 255, 0.5);
}
:global(.dark) .wc-off {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.05);
}
.wc-on, .wc-mixed {
  border-color: #6366f1;
  background: #6366f1;
}
.wc-blocked {
  border-color: rgb(203 213 225);
  background: rgba(148, 163, 184, 0.12);
}
.wc-blocked svg { width: 12px; height: 12px; color: rgb(148 163 184); }
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
.peer:focus-visible + .wc-box {
  outline: 2px solid rgba(99, 102, 241, 0.6);
  outline-offset: 2px;
}
label:active .wc-box { transform: scale(0.9); }
</style>

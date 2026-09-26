<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  size:   { type: String, default: 'small' },
  dark:   { type: Boolean, default: true },
  config: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:config'])

const isLarge = computed(() => props.size === 'large')

const status = ref('loading')
const chats = ref([])
const profilesById = ref({})
const meId = ref(null)

const activeId = ref(null)
const messages = ref([])
const text = ref('')
const sending = ref(false)
const dropdownOpen = ref(false)
const scroller = ref(null)
const inputEl = ref(null)
const appIcons = ref({})

const activeChat = computed(() => chats.value.find(c => c.id === activeId.value) || null)

function otherMemberId(chat) {
  return chat.members.find(m => m !== meId.value) || chat.members[0]
}
function title(chat) {
  if (!chat) return 'Chat'
  if (chat.kind === 'group') return chat.title || 'Group'
  return profilesById.value[otherMemberId(chat)]?.name || 'Direct message'
}

function chatProfile(chat) { return chat ? profilesById.value[otherMemberId(chat)] : null }
function senderProfile(m) { return m?.senderId ? profilesById.value[m.senderId] : null }
function initials(name) {
  const p = (name || '?').trim().split(/\s+/)
  return (p.length >= 2 ? p[0][0] + p[1][0] : (name || '?').slice(0, 2)).toUpperCase()
}
function avatarImg(p) {
  if (!p?.hasImage) return null
  const v = p.imageUpdatedAt ? new Date(p.imageUpdatedAt).getTime() : ''
  return `/api/auth/profiles/${p._id}/avatar${v ? `?v=${v}` : ''}`
}

async function api(path, opts = {}) {
  const res = await fetch(`/api/echo${path}`, { credentials: 'include', ...opts })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function loadChats() {
  chats.value = await api('/chats')
  if (!chats.value.length) { status.value = 'empty'; return }
  status.value = 'ready'
  if (!activeId.value) {
    const saved = props.config?.chatId
    const initial = saved && chats.value.some(c => c.id === saved) ? saved : chats.value[0].id
    await select(initial, false)
  }
}

async function select(id, persist = true) {
  activeId.value = id
  dropdownOpen.value = false
  if (persist && id !== props.config?.chatId) {
    emit('update:config', { ...props.config, chatId: id })
  }
  await loadMessages(true)
}

async function loadMessages(scroll = false) {
  if (!activeId.value) return
  const next = await api(`/messages/${activeId.value}`)
  const grew = next.length !== messages.value.length
  messages.value = next
  if (scroll || grew) await scrollToBottom()
}

async function scrollToBottom() {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

async function send() {
  const body = text.value.trim()
  if (!body || sending.value || !activeId.value) return
  sending.value = true
  try {
    const msg = await api(`/messages/${activeId.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'text', payload: { text: body } }),
    })
    messages.value = [...messages.value, msg]
    text.value = ''
    await scrollToBottom()
  } catch {} finally {
    sending.value = false
    nextTick(() => inputEl.value?.focus())
  }
}

function preview(m) {
  return m.payload?.text ?? ''
}
const isMine = m => m.senderId && m.senderId === meId.value

const isAttachment = m => m.type !== 'text' && m.type !== 'system'
const attachLabel = m => m.payload?.name || m.payload?.title || 'Attachment'
const appIcon = id => appIcons.value[id] || ''
const chatLink = m => `/echo/c/${m.chatId}?msg=${m.id}`

const URL_RE = /(https?:\/\/[^\s<]+)/g
const TRAILING = /[.,!?;:'")\]}]+$/
function linkify(text) {
  const str = String(text ?? '')
  const parts = []
  let last = 0
  for (const m of str.matchAll(URL_RE)) {
    if (m.index > last) parts.push({ text: str.slice(last, m.index) })
    let url = m[0]
    const trail = url.match(TRAILING)
    const tail = trail ? trail[0] : ''
    if (tail) url = url.slice(0, -tail.length)
    parts.push({ text: url, href: url })
    if (tail) parts.push({ text: tail })
    last = m.index + m[0].length
  }
  if (last < str.length) parts.push({ text: str.slice(last) })
  return parts
}

let chatTimer = null
let msgTimer = null
onMounted(async () => {
  try {
    const [me] = await Promise.all([
      fetch('/api/auth/me', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/auth/profiles', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(list => { profilesById.value = Object.fromEntries(list.map(p => [String(p._id), p])) })
        .catch(() => {}),
      fetch('/api/registry/apps')
        .then(r => r.ok ? r.json() : [])
        .then(list => { appIcons.value = Object.fromEntries(list.map(a => [a.id, a.iconSvg])) })
        .catch(() => {}),
    ])
    meId.value = me?._id ? String(me._id) : null
    await loadChats()
  } catch {
    status.value = 'error'
  }
  chatTimer = setInterval(() => loadChats().catch(() => {}), 10000)
  msgTimer = setInterval(() => loadMessages().catch(() => {}), 4000)
})
onUnmounted(() => { clearInterval(chatTimer); clearInterval(msgTimer) })

watch(isLarge, v => { if (v) dropdownOpen.value = false })
</script>

<template>
  <div class="echo-w" :class="{ light: !dark, large: isLarge }">
    <a class="ew-head" href="/echo/" title="Open Echo">
      <span class="ew-logo">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7.5 8.5h9M7.5 12h6"/><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9.5 9.5 0 0 1-3.9-.83L3 21l1.4-4.2A8.2 8.2 0 0 1 3.5 11.5 8.38 8.38 0 0 1 12 3a8.38 8.38 0 0 1 9 8.5Z"/>
        </svg>
      </span>
      <span class="ew-title">Echo</span>
      <svg class="ew-ext" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </a>

    <div v-if="status === 'loading'" class="ew-msg">Loading…</div>
    <div v-else-if="status === 'error'" class="ew-msg">Couldn't reach Echo.</div>
    <div v-else-if="status === 'empty'" class="ew-msg">No chats yet — open Echo to start one.</div>

    <div v-else class="ew-body">
      <ul v-if="isLarge" class="ew-sidebar">
        <li v-for="c in chats" :key="c.id">
          <button class="ew-chat-item" :class="{ active: c.id === activeId }" :title="title(c)" @click="select(c.id)">
            <span class="ew-avatar" :style="{ background: chatProfile(c)?.color || '#64748b' }">
              <img v-if="avatarImg(chatProfile(c))" :src="avatarImg(chatProfile(c))" alt="" />
              <template v-else>{{ chatProfile(c)?.emoji || initials(title(c)) }}</template>
            </span>
            <span class="ew-chat-name">{{ title(c) }}</span>
            <span v-if="c.unread" class="ew-badge">{{ c.unread }}</span>
          </button>
        </li>
      </ul>

      <div class="ew-pane">
        <div v-if="!isLarge" class="ew-dropdown">
          <button class="ew-dd-toggle" @click="dropdownOpen = !dropdownOpen">
            <span class="ew-avatar" :style="{ background: chatProfile(activeChat)?.color || '#64748b' }">
              <img v-if="avatarImg(chatProfile(activeChat))" :src="avatarImg(chatProfile(activeChat))" alt="" />
              <template v-else>{{ chatProfile(activeChat)?.emoji || initials(title(activeChat)) }}</template>
            </span>
            <span class="ew-chat-name">{{ title(activeChat) }}</span>
            <span v-if="activeChat?.unread" class="ew-badge">{{ activeChat.unread }}</span>
            <svg class="ew-caret" :class="{ open: dropdownOpen }" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <ul v-if="dropdownOpen" class="ew-dd-list">
            <li v-for="c in chats" :key="c.id">
              <button class="ew-chat-item" :class="{ active: c.id === activeId }" :title="title(c)" @click="select(c.id)">
                <span class="ew-chat-name">{{ title(c) }}</span>
                <span v-if="c.unread" class="ew-badge">{{ c.unread }}</span>
              </button>
            </li>
          </ul>
        </div>

        <div ref="scroller" class="ew-messages">
          <div v-if="!messages.length" class="ew-empty">No messages yet</div>
          <div
            v-for="m in messages"
            :key="m.id"
            class="ew-bubble-row"
            :class="m.type === 'system' ? 'system' : (isMine(m) ? 'mine' : 'theirs')"
          >
            <span
              v-if="m.type !== 'system' && !isMine(m)"
              class="ew-avatar sm"
              :style="{ background: senderProfile(m)?.color || '#64748b' }"
            >
              <img v-if="avatarImg(senderProfile(m))" :src="avatarImg(senderProfile(m))" alt="" />
              <template v-else>{{ senderProfile(m)?.emoji || initials(senderProfile(m)?.name || '?') }}</template>
            </span>
            <a
              v-if="isAttachment(m)"
              class="ew-attach"
              :href="chatLink(m)"
              :title="`Open in Echo: ${attachLabel(m)}`"
            >
              <span class="ew-attach-icon" v-html="appIcon(m.sourceApp)" />
              <span class="ew-attach-label">{{ attachLabel(m) }}</span>
            </a>
            <span v-else-if="m.type === 'text'" class="ew-bubble"><template
              v-for="(p, i) in linkify(m.payload?.text || '')"
              :key="i"
            ><a
              v-if="p.href"
              :href="p.href"
              target="_blank"
              rel="noopener noreferrer"
              class="ew-link"
            >{{ p.text }}</a><template v-else>{{ p.text }}</template></template></span>
            <span v-else class="ew-bubble">{{ preview(m) }}</span>
          </div>
        </div>

        <form class="ew-composer" @submit.prevent="send">
          <input
            ref="inputEl"
            v-model="text"
            class="ew-input"
            type="text"
            placeholder="Message…"
            :disabled="sending"
          />
          <button class="ew-send" type="submit" :disabled="sending || !text.trim()" title="Send">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.echo-w {
  --ew-bg: rgba(12, 12, 24, 0.82);
  --ew-border: rgba(255, 255, 255, 0.09);
  --ew-shadow: 0 14px 44px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255, 255, 255, 0.04) inset;
  --ew-text: #fff;
  --ew-dim: rgba(255, 255, 255, 0.5);
  --ew-hover: rgba(255, 255, 255, 0.07);
  --ew-active: rgba(255, 255, 255, 0.12);
  --ew-accent: #818cf8;
  --ew-scroll: rgba(255, 255, 255, 0.18);
  --ew-input: rgba(255, 255, 255, 0.07);
  --ew-them: rgba(255, 255, 255, 0.1);

  width: 100%;
  background: var(--ew-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--ew-border);
  border-radius: 16px;
  box-shadow: var(--ew-shadow);
  color: var(--ew-text);
  overflow: hidden;
  line-height: normal;
  display: flex;
  flex-direction: column;
  height: 360px;
}
.echo-w.large { height: 460px; }
.echo-w.light {
  --ew-bg: rgba(255, 255, 255, 0.74);
  --ew-border: rgba(15, 23, 42, 0.1);
  --ew-shadow: 0 14px 44px rgba(15, 23, 42, 0.16), 0 0 0 0.5px rgba(255, 255, 255, 0.7) inset;
  --ew-text: #0f172a;
  --ew-dim: rgba(15, 23, 42, 0.5);
  --ew-hover: rgba(15, 23, 42, 0.05);
  --ew-active: rgba(15, 23, 42, 0.09);
  --ew-scroll: rgba(15, 23, 42, 0.2);
  --ew-input: rgba(15, 23, 42, 0.05);
  --ew-them: rgba(15, 23, 42, 0.07);
}

.ew-head {
  display: flex; align-items: center; gap: 7px;
  padding: 11px 13px; text-decoration: none; color: inherit;
  border-bottom: 1px solid var(--ew-border);
}
.ew-logo { color: var(--ew-accent); display: flex; }
.ew-title { font-size: 13px; font-weight: 700; flex: 1; }
.ew-ext { color: var(--ew-dim); flex-shrink: 0; }
.ew-head:hover .ew-ext { color: var(--ew-accent); }

.ew-msg {
  display: flex; align-items: center; justify-content: center;
  flex: 1; padding: 0 14px; font-size: 12px; color: var(--ew-dim); text-align: center;
}

.ew-body { display: flex; flex: 1; min-height: 0; }
.ew-pane { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; }

.ew-sidebar {
  list-style: none; margin: 0; padding: 6px;
  width: 158px; flex-shrink: 0;
  border-right: 1px solid var(--ew-border);
  overflow-y: auto;
  min-height: 0;
}

.ew-chat-item {
  width: 100%; display: flex; align-items: center; gap: 6px;
  padding: 8px 10px; border: none; background: transparent; border-radius: 9px;
  cursor: pointer; color: inherit; text-align: left; transition: background 0.12s;
}
.ew-chat-item:hover { background: var(--ew-hover); }
.ew-chat-item.active { background: var(--ew-active); }
.ew-chat-name {
  flex: 1; min-width: 0; font-size: 13px; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ew-badge {
  flex-shrink: 0; min-width: 18px; height: 18px; padding: 0 5px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--ew-accent); color: #fff; font-size: 10px; font-weight: 600; border-radius: 9px;
}

.ew-dropdown { position: relative; padding: 6px; border-bottom: 1px solid var(--ew-border); }
.ew-dd-toggle {
  width: 100%; display: flex; align-items: center; gap: 6px;
  padding: 8px 10px; border: none; background: var(--ew-hover); border-radius: 9px;
  cursor: pointer; color: inherit;
}
.ew-caret { color: var(--ew-dim); transition: transform 0.15s; }
.ew-caret.open { transform: rotate(180deg); }
.ew-dd-list {
  position: absolute; left: 6px; right: 6px; top: calc(100% - 2px); z-index: 20;
  list-style: none; margin: 0; padding: 5px;
  max-height: 168px; overflow-y: auto;
  background: var(--ew-bg); backdrop-filter: blur(20px);
  border: 1px solid var(--ew-border); border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.ew-messages {
  flex: 1; min-height: 0; overflow-y: auto; padding: 10px;
  display: flex; flex-direction: column; gap: 6px;
}
.ew-empty {
  margin: auto; font-size: 12px; color: var(--ew-dim);
}
.ew-avatar {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 11px; font-weight: 600; line-height: 1;
  overflow: hidden;
}
.ew-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ew-avatar.sm { width: 22px; height: 22px; font-size: 9px; }

.ew-bubble-row { display: flex; align-items: flex-end; gap: 6px; }
.ew-bubble-row.mine { justify-content: flex-end; }
.ew-bubble-row.theirs { justify-content: flex-start; }
.ew-bubble-row.system { justify-content: center; }
.ew-bubble {
  max-width: 80%; padding: 7px 11px; border-radius: 14px;
  font-size: 13px; word-break: break-word; white-space: pre-wrap;
}
.ew-bubble-row.mine .ew-bubble { background: var(--ew-accent); color: #fff; }
.ew-bubble-row.theirs .ew-bubble { background: var(--ew-them); color: var(--ew-text); }
.ew-bubble-row.system .ew-bubble {
  background: transparent; color: var(--ew-dim); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;
}

.ew-attach {
  max-width: 80%; display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 11px; border-radius: 14px; background: var(--ew-them);
  font-size: 13px; word-break: break-word;
  color: #38bdf8; text-decoration: underline; cursor: pointer;
}
.ew-attach:hover { color: #7dd3fc; }
.ew-attach-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ew-attach-icon { width: 15px; height: 15px; flex-shrink: 0; display: inline-flex; line-height: 0; }
.ew-attach-icon :deep(svg) { width: 100%; height: 100%; display: block; }

.ew-link { color: #38bdf8; text-decoration: underline; word-break: break-all; }
.ew-link:hover { color: #7dd3fc; }
.ew-bubble-row.mine .ew-link { color: #bae6fd; }
.ew-bubble-row.mine .ew-link:hover { color: #e0f2fe; }

.ew-composer {
  display: flex; align-items: center; gap: 7px;
  padding: 8px; border-top: 1px solid var(--ew-border);
}
.ew-input {
  flex: 1; min-width: 0; height: 33px; padding: 0 11px;
  background: var(--ew-input); border: 1px solid var(--ew-border); border-radius: 10px;
  color: var(--ew-text); font-size: 13px; outline: none;
}
.ew-input::placeholder { color: var(--ew-dim); }
.ew-input:focus { border-color: var(--ew-accent); }
.ew-send {
  flex-shrink: 0; width: 33px; height: 33px; display: flex; align-items: center; justify-content: center;
  background: var(--ew-accent); color: #fff; border: none; border-radius: 10px; cursor: pointer;
  transition: opacity 0.12s;
}
.ew-send:disabled { opacity: 0.4; cursor: default; }

.ew-messages::-webkit-scrollbar, .ew-sidebar::-webkit-scrollbar, .ew-dd-list::-webkit-scrollbar { width: 6px; }
.ew-messages::-webkit-scrollbar-thumb, .ew-sidebar::-webkit-scrollbar-thumb, .ew-dd-list::-webkit-scrollbar-thumb {
  background: var(--ew-scroll); border-radius: 3px;
}
</style>

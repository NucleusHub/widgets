<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getStatus, getNowPlaying, play, pause, next, previous, seek } from './api/spotify.js'

const props = defineProps({
  size: { type: String, default: 'medium' },
})

const status     = ref('loading')
const track      = ref(null)
const playing    = ref(false)
const progressMs = ref(0)
const durationMs = ref(0)
const isSeeking  = ref(false)

const progressPct = computed(() =>
  durationMs.value > 0 ? (progressMs.value / durationMs.value) * 100 : 0
)

const seekBarStyle = computed(() => ({
  background: `linear-gradient(to right, #818cf8 ${progressPct.value}%, rgba(255,255,255,0.12) ${progressPct.value}%)`,
}))

function fmt(ms) {
  const s = Math.floor((ms || 0) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

let pollTimer = null
let tickTimer = null

async function fetchNowPlaying() {
  try {
    const data = await getNowPlaying()
    if (!data) return
    playing.value = !!data.playing
    if (data.track) {
      track.value      = data.track
      durationMs.value = data.track.duration_ms
      if (!isSeeking.value) progressMs.value = data.track.progress_ms ?? 0
    } else {
      track.value      = null
      progressMs.value = 0
      durationMs.value = 0
    }
  } catch { /* keep last known state */ }
}

function startPolling() {
  fetchNowPlaying()
  pollTimer = setInterval(fetchNowPlaying, 3000)
  tickTimer = setInterval(() => {
    if (playing.value && !isSeeking.value && durationMs.value > 0)
      progressMs.value = Math.min(progressMs.value + 250, durationMs.value)
  }, 250)
}

async function togglePlay() {
  try {
    if (playing.value) { await pause(); playing.value = false }
    else               { await play();  playing.value = true  }
    setTimeout(fetchNowPlaying, 500)
  } catch {}
}

async function skipNext()     { try { await next();     track.value = null; progressMs.value = 0; setTimeout(fetchNowPlaying, 700) } catch {} }
async function skipPrevious() { try { await previous(); progressMs.value = 0; setTimeout(fetchNowPlaying, 700) } catch {} }

function onSeekStart() { isSeeking.value = true }
function onSeekMove(e) { progressMs.value = Number(e.target.value) }
async function onSeekCommit(e) {
  const pos = Number(e.target.value)
  progressMs.value = pos
  isSeeking.value  = false
  try { await seek(pos); setTimeout(fetchNowPlaying, 400) } catch {}
}

onMounted(async () => {
  try {
    const data = await getStatus()
    if (data?.authenticated) { status.value = 'ready'; startPolling() }
    else                      { status.value = 'unauthenticated' }
  } catch { status.value = 'unauthenticated' }
})

onUnmounted(() => { clearInterval(pollTimer); clearInterval(tickTimer) })
</script>

<template>
  <div class="widget" :class="`size-${size}`">

    <!-- ── Loading ── -->
    <template v-if="status === 'loading'">
      <div class="status-card">
        <svg style="width:16px;height:16px;animation:spin 1s linear infinite;color:rgba(255,255,255,0.3);flex-shrink:0" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"
                  stroke-dasharray="31.4" stroke-dashoffset="10" />
        </svg>
        <span style="color:rgba(255,255,255,0.3);font-size:13px">Connecting…</span>
      </div>
    </template>

    <!-- ── Unauthenticated ── -->
    <template v-else-if="status === 'unauthenticated'">
      <div class="status-card">
        <svg style="width:28px;height:28px;flex-shrink:0" viewBox="0 0 168 168" xmlns="http://www.w3.org/2000/svg">
          <circle cx="84" cy="84" r="84" fill="#1DB954"/>
          <path d="M122.3 116.7c-1.6 2.6-4.9 3.4-7.5 1.8-20.5-12.5-46.3-15.3-76.7-8.4-2.9.7-5.9-1.1-6.6-4-.7-2.9 1.1-5.9 4-6.6 33.2-7.6 61.7-4.3 84.7 9.7 2.6 1.6 3.4 4.9 2.1 7.5zm10.3-22.9c-2 3.3-6.3 4.3-9.5 2.3-23.4-14.4-59.1-18.5-86.8-10.1-3.5 1.1-7.3-.9-8.4-4.4-1.1-3.5.9-7.3 4.4-8.4 31.6-9.6 70.9-4.9 97.9 11.5 3.3 2 4.3 6.3 2.4 9.1zm.9-23.8c-28-16.6-74.2-18.1-100.9-10-4.2 1.3-8.7-1.1-10-5.3-1.3-4.2 1.1-8.7 5.3-10 30.6-9.3 81.5-7.5 113.7 11.6 3.8 2.3 5.1 7.2 2.8 11-2.2 3.7-7.1 5-10.9 2.7z" fill="white"/>
        </svg>
        <div style="flex:1;min-width:0">
          <p style="color:#fff;font-size:13px;font-weight:600;line-height:1">Spotify</p>
          <a href="/api/spotify/login" style="color:#1DB954;font-size:11px;text-decoration:none;margin-top:4px;display:inline-block">
            Connect account →
          </a>
        </div>
      </div>
    </template>

    <!-- ── Player ── -->
    <template v-else>

      <!-- SMALL: single compact row -->
      <template v-if="size === 'small'">
        <div class="small-row">
          <div class="art art-sm">
            <img v-if="track?.album?.image" :src="track.album.image" :key="track.id" class="art-img" />
            <span v-else class="art-placeholder">♪</span>
          </div>
          <div class="track-info">
            <p class="track-name">{{ track?.name ?? 'Nothing playing' }}</p>
            <p class="track-artist">{{ track ? track.artists.map(a => a.name).join(', ') : '—' }}</p>
          </div>
          <div class="controls controls-sm">
            <button class="ctrl-btn" :disabled="!track" @click="skipPrevious">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/></svg>
            </button>
            <button class="play-btn play-btn-sm" :disabled="!track" @click="togglePlay">
              <svg v-if="playing" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              <svg v-else class="w-3.5 h-3.5 translate-x-px" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button class="ctrl-btn" :disabled="!track" @click="skipNext">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2V6z"/></svg>
            </button>
          </div>
        </div>
      </template>

      <!-- MEDIUM: art + info + seek + controls -->
      <template v-else-if="size === 'medium'">
        <div class="medium-layout">
          <div class="medium-top">
            <div class="art art-md">
              <img v-if="track?.album?.image" :src="track.album.image" :key="track.id" class="art-img" />
              <span v-else class="art-placeholder">♪</span>
            </div>
            <div class="track-info">
              <p class="track-name">{{ track?.name ?? 'Nothing playing' }}</p>
              <p class="track-artist">{{ track ? track.artists.map(a => a.name).join(', ') : 'Open Spotify to start' }}</p>
            </div>
          </div>
          <div class="seek-wrap">
            <input type="range" :min="0" :max="durationMs || 1" :value="progressMs"
              :disabled="!track" class="seek-bar" :style="seekBarStyle"
              @mousedown="onSeekStart" @touchstart.passive="onSeekStart"
              @input="onSeekMove" @change="onSeekCommit" />
            <div class="seek-times">
              <span>{{ fmt(progressMs) }}</span>
              <span>{{ fmt(durationMs) }}</span>
            </div>
          </div>
          <div class="controls controls-md">
            <button class="ctrl-btn" :disabled="!track" @click="skipPrevious">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/></svg>
            </button>
            <button class="play-btn" :disabled="!track" @click="togglePlay">
              <svg v-if="playing" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              <svg v-else class="w-4 h-4 translate-x-px" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button class="ctrl-btn" :disabled="!track" @click="skipNext">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2V6z"/></svg>
            </button>
          </div>
        </div>
      </template>

      <!-- LARGE: centered art + full info + seek + big controls -->
      <template v-else>
        <div class="large-layout">
          <div class="large-art-center">
            <div class="art art-xl">
              <img v-if="track?.album?.image" :src="track.album.image" :key="track.id" class="art-img" />
              <span v-else class="art-placeholder" style="font-size:28px">♪</span>
            </div>
          </div>
          <div class="large-info">
            <p class="large-track-name">{{ track?.name ?? 'Nothing playing' }}</p>
            <p class="large-track-artist">{{ track ? track.artists.map(a => a.name).join(', ') : 'Open Spotify to start' }}</p>
            <p v-if="track?.album?.name" class="large-track-album">{{ track.album.name }}</p>
          </div>
          <div class="seek-wrap">
            <input type="range" :min="0" :max="durationMs || 1" :value="progressMs"
              :disabled="!track" class="seek-bar" :style="seekBarStyle"
              @mousedown="onSeekStart" @touchstart.passive="onSeekStart"
              @input="onSeekMove" @change="onSeekCommit" />
            <div class="seek-times">
              <span>{{ fmt(progressMs) }}</span>
              <span>{{ fmt(durationMs) }}</span>
            </div>
          </div>
          <div class="controls controls-lg">
            <button class="ctrl-btn ctrl-btn-lg" :disabled="!track" @click="skipPrevious">
              <svg style="width:20px;height:20px" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/></svg>
            </button>
            <button class="play-btn play-btn-lg" :disabled="!track" @click="togglePlay">
              <svg v-if="playing" style="width:24px;height:24px" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              <svg v-else style="width:24px;height:24px;transform:translateX(1px)" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button class="ctrl-btn ctrl-btn-lg" :disabled="!track" @click="skipNext">
              <svg style="width:20px;height:20px" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2V6z"/></svg>
            </button>
          </div>
        </div>
      </template>

    </template>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Base widget shell ── */
.widget {
  display: inline-block;
  background: rgba(10, 10, 22, 0.82);
  backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.45),
    0 0 0 0.5px rgba(255, 255, 255, 0.04) inset;
  overflow: hidden;
  color: #fff;
}

/* ── Status card: fixed size regardless of size prop ── */
.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  width: 260px;
}

/* ── Album art ── */
.art {
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.art-sm  { width: 36px; height: 36px; }
.art-md  { width: 52px; height: 52px; border-radius: 10px; }
.art-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.art-placeholder { font-size: 14px; color: rgba(255,255,255,0.2); }

/* ── Track info ── */
.track-info  { flex: 1; min-width: 0; }
.track-name  { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; }
.track-artist { font-size: 11px; color: rgba(255,255,255,0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }

/* ── Seek bar ── */
.seek-wrap { padding: 0 14px; }
.seek-bar {
  -webkit-appearance: none;
  appearance: none;
  display: block;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.seek-bar:disabled { opacity: 0.3; cursor: not-allowed; }
.seek-bar::-webkit-slider-runnable-track { height: 3px; border-radius: 2px; }
.seek-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 11px; height: 11px;
  border-radius: 50%; background: #fff;
  transform: scale(0); transition: transform 0.15s ease; margin-top: -4px;
}
.seek-bar:hover::-webkit-slider-thumb,
.seek-bar:active::-webkit-slider-thumb { transform: scale(1); }
.seek-bar::-moz-range-thumb {
  width: 11px; height: 11px; border: none;
  border-radius: 50%; background: #fff;
  transform: scale(0); transition: transform 0.15s ease;
}
.seek-bar:hover::-moz-range-thumb,
.seek-bar:active::-moz-range-thumb { transform: scale(1); }
.seek-times {
  display: flex; justify-content: space-between;
  font-size: 10px; color: rgba(255,255,255,0.3);
  margin-top: 3px; user-select: none;
}

/* ── Controls ── */
.controls { display: flex; align-items: center; justify-content: center; gap: 8px; }
.controls-sm { gap: 4px; flex-shrink: 0; }
.controls-md { padding: 4px 14px 12px; gap: 12px; }
.controls-lg { padding: 8px 16px 16px; gap: 16px; }

.ctrl-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 50%;
  color: rgba(255,255,255,0.6);
  transition: color 0.15s, background 0.15s;
  cursor: pointer;
}
.ctrl-btn:hover  { color: #fff; background: rgba(255,255,255,0.08); }
.ctrl-btn:active { background: rgba(255,255,255,0.14); }
.ctrl-btn:disabled { opacity: 0.25; cursor: not-allowed; pointer-events: none; }
.ctrl-btn-lg { width: 38px; height: 38px; }

.play-btn {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 50%;
  background: #fff; color: #0a0a16;
  transition: background 0.15s, transform 0.1s;
  cursor: pointer;
}
.play-btn:hover  { background: #e8e8f0; }
.play-btn:active { transform: scale(0.93); }
.play-btn:disabled { opacity: 0.25; cursor: not-allowed; pointer-events: none; }
.play-btn-sm { width: 28px; height: 28px; }
.play-btn-lg { width: 48px; height: 48px; }

/* ── SMALL layout ── */
.small-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
}

/* ── MEDIUM layout ── */
.medium-layout { display: flex; flex-direction: column; width: 260px; }
.medium-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px 10px;
}

/* ── LARGE layout ── */
.large-layout { display: flex; flex-direction: column; width: 320px; }

.large-art-center {
  display: flex;
  justify-content: center;
  padding: 16px 16px 12px;
}

.art-xl {
  width: 160px;
  height: 160px;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.large-info {
  padding: 0 16px 10px;
  text-align: center;
}

.large-track-name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.large-track-artist {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.large-track-album {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

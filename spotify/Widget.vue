<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getStatus, getNowPlaying, play, pause, next, previous, seek } from '@/api/spotify.js'

const status     = ref('loading') // 'loading' | 'unauthenticated' | 'ready'
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
    if (playing.value && !isSeeking.value && durationMs.value > 0) {
      progressMs.value = Math.min(progressMs.value + 250, durationMs.value)
    }
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
  <div class="widget">

    <!-- Loading -->
    <template v-if="status === 'loading'">
      <div class="flex items-center gap-3 px-4 py-3">
        <svg class="w-4 h-4 animate-spin text-white/30 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"
                  stroke-dasharray="31.4" stroke-dashoffset="10" />
        </svg>
        <span class="text-white/30 text-sm">Connecting…</span>
      </div>
    </template>

    <!-- Unauthenticated -->
    <template v-else-if="status === 'unauthenticated'">
      <div class="flex items-center gap-3 px-4 py-3">
        <svg class="w-7 h-7 shrink-0" viewBox="0 0 168 168" xmlns="http://www.w3.org/2000/svg">
          <circle cx="84" cy="84" r="84" fill="#1DB954"/>
          <path d="M122.3 116.7c-1.6 2.6-4.9 3.4-7.5 1.8-20.5-12.5-46.3-15.3-76.7-8.4-2.9.7-5.9-1.1-6.6-4-.7-2.9 1.1-5.9 4-6.6 33.2-7.6 61.7-4.3 84.7 9.7 2.6 1.6 3.4 4.9 2.1 7.5zm10.3-22.9c-2 3.3-6.3 4.3-9.5 2.3-23.4-14.4-59.1-18.5-86.8-10.1-3.5 1.1-7.3-.9-8.4-4.4-1.1-3.5.9-7.3 4.4-8.4 31.6-9.6 70.9-4.9 97.9 11.5 3.3 2 4.3 6.3 2.4 9.1zm.9-23.8c-28-16.6-74.2-18.1-100.9-10-4.2 1.3-8.7-1.1-10-5.3-1.3-4.2 1.1-8.7 5.3-10 30.6-9.3 81.5-7.5 113.7 11.6 3.8 2.3 5.1 7.2 2.8 11-2.2 3.7-7.1 5-10.9 2.7z" fill="white"/>
        </svg>
        <div class="flex-1 min-w-0">
          <p class="text-white text-sm font-medium leading-none">Spotify</p>
          <a href="/api/spotify/login"
             class="text-[#1DB954] text-xs hover:underline mt-0.5 inline-block">
            Connect account →
          </a>
        </div>
      </div>
    </template>

    <!-- Player -->
    <template v-else>
      <!-- Art + track info -->
      <div class="flex items-center gap-3 px-3 pt-3 pb-1">
        <div class="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white/8">
          <img v-if="track?.album?.image" :src="track.album.image" :key="track.id"
               class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-6 h-6 text-white/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
            </svg>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-white font-semibold text-sm leading-snug truncate">
            {{ track?.name ?? 'Nothing playing' }}
          </p>
          <p class="text-white/50 text-xs mt-0.5 truncate">
            {{ track ? track.artists.map(a => a.name).join(', ') : 'Open Spotify to start' }}
          </p>
        </div>
      </div>

      <!-- Seek bar -->
      <div class="px-3 mt-1">
        <input
          type="range"
          :min="0" :max="durationMs || 1" :value="progressMs"
          :disabled="!track"
          class="seek-bar"
          :style="seekBarStyle"
          @mousedown="onSeekStart"
          @touchstart.passive="onSeekStart"
          @input="onSeekMove"
          @change="onSeekCommit"
        />
        <div class="flex justify-between text-[10px] text-white/30 mt-1 select-none">
          <span>{{ fmt(progressMs) }}</span>
          <span>{{ fmt(durationMs) }}</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex items-center justify-center gap-4 px-3 pb-3 mt-1">
        <button class="ctrl-btn" :disabled="!track" @click="skipPrevious" title="Previous">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/>
          </svg>
        </button>
        <button class="play-btn" :disabled="!track" @click="togglePlay">
          <svg v-if="playing" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
          <svg v-else class="w-4 h-4 translate-x-px" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
        <button class="ctrl-btn" :disabled="!track" @click="skipNext" title="Next">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2V6z"/>
          </svg>
        </button>
      </div>
    </template>

  </div>
</template>

<style scoped>
.widget {
  width: 260px;
  background: rgba(10, 10, 22, 0.82);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.45),
    0 0 0 0.5px rgba(255, 255, 255, 0.04) inset;
}

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
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #fff;
  transform: scale(0);
  transition: transform 0.15s ease;
  margin-top: -4px;
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

.ctrl-btn {
  display: flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem; border-radius: 50%;
  color: rgba(255,255,255,0.6);
  transition: color 0.15s, background 0.15s;
  cursor: pointer;
}
.ctrl-btn:hover  { color: #fff; background: rgba(255,255,255,0.08); }
.ctrl-btn:active { background: rgba(255,255,255,0.14); }
.ctrl-btn:disabled { opacity: 0.25; cursor: not-allowed; pointer-events: none; }

.play-btn {
  display: flex; align-items: center; justify-content: center;
  width: 2.25rem; height: 2.25rem; border-radius: 50%;
  background: #fff; color: #0a0a16;
  transition: background 0.15s, transform 0.1s;
  cursor: pointer;
}
.play-btn:hover  { background: #e8e8f0; }
.play-btn:active { transform: scale(0.93); }
.play-btn:disabled { opacity: 0.25; cursor: not-allowed; pointer-events: none; }
</style>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getStatus, getNowPlaying, play, pause, next, previous, seek } from '@/api/spotify.js'
import { usePoller, useWidgetState, formatDuration } from 'core'
import WidgetCard   from 'core/components/WidgetCard.vue'
import WidgetStatus from 'core/components/WidgetStatus.vue'

const { status, setReady, setUnauthenticated } = useWidgetState()

const track      = ref(null)
const playing    = ref(false)
const progressMs = ref(0)
const durationMs = ref(0)
const isSeeking  = ref(false)

const progressPct  = computed(() =>
  durationMs.value > 0 ? (progressMs.value / durationMs.value) * 100 : 0
)
const seekBarStyle = computed(() => ({
  background: `linear-gradient(to right, var(--accent) ${progressPct.value}%, rgba(255,255,255,0.12) ${progressPct.value}%)`,
}))

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
  } catch {
    // swallow — keep showing last known state
  }
}

function tick() {
  if (playing.value && !isSeeking.value && durationMs.value > 0) {
    progressMs.value = Math.min(progressMs.value + 250, durationMs.value)
  }
}

const { start: startPoll } = usePoller(fetchNowPlaying, 3000)
const { start: startTick } = usePoller(tick, 250, { immediate: false })

async function togglePlay() {
  try {
    if (playing.value) { await pause(); playing.value = false }
    else               { await play();  playing.value = true  }
    setTimeout(fetchNowPlaying, 500)
  } catch { /* no active device */ }
}

async function skipNext() {
  try {
    await next()
    track.value      = null
    progressMs.value = 0
    setTimeout(fetchNowPlaying, 700)
  } catch {}
}

async function skipPrevious() {
  try {
    await previous()
    progressMs.value = 0
    setTimeout(fetchNowPlaying, 700)
  } catch {}
}

function onSeekStart()  { isSeeking.value = true }
function onSeekMove(e)  { progressMs.value = Number(e.target.value) }

async function onSeekCommit(e) {
  const pos = Number(e.target.value)
  progressMs.value = pos
  isSeeking.value  = false
  try {
    await seek(pos)
    setTimeout(fetchNowPlaying, 400)
  } catch {}
}

onMounted(async () => {
  try {
    const data = await getStatus()
    if (data?.authenticated) {
      setReady()
      startPoll()
      startTick()
    } else {
      setUnauthenticated()
    }
  } catch {
    setUnauthenticated()
  }
})
</script>

<template>
  <div class="page">
    <!-- Background blobs (Spotify palette) -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="blob" style="top:-160px;left:-160px;width:520px;height:520px;background:rgba(109,40,217,0.35)" />
      <div class="blob" style="bottom:-160px;right:-160px;width:520px;height:520px;background:rgba(67,56,202,0.35)" />
      <div class="blob" style="top:50%;left:50%;transform:translate(-50%,-50%);width:320px;height:320px;background:rgba(16,185,129,0.12)" />
    </div>

    <WidgetStatus :status="status">
      <!-- Unauthenticated -->
      <WidgetCard v-if="status === 'unauthenticated'" class="flex flex-col items-center gap-5 py-8">
        <svg class="w-12 h-12" viewBox="0 0 168 168" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="84" cy="84" r="84" fill="#1DB954"/>
          <path d="M122.3 116.7c-1.6 2.6-4.9 3.4-7.5 1.8-20.5-12.5-46.3-15.3-76.7-8.4-2.9.7-5.9-1.1-6.6-4-.7-2.9 1.1-5.9 4-6.6 33.2-7.6 61.7-4.3 84.7 9.7 2.6 1.6 3.4 4.9 2.1 7.5zm10.3-22.9c-2 3.3-6.3 4.3-9.5 2.3-23.4-14.4-59.1-18.5-86.8-10.1-3.5 1.1-7.3-.9-8.4-4.4-1.1-3.5.9-7.3 4.4-8.4 31.6-9.6 70.9-4.9 97.9 11.5 3.3 2 4.3 6.3 2.4 9.1zm.9-23.8c-28-16.6-74.2-18.1-100.9-10-4.2 1.3-8.7-1.1-10-5.3-1.3-4.2 1.1-8.7 5.3-10 30.6-9.3 81.5-7.5 113.7 11.6 3.8 2.3 5.1 7.2 2.8 11-2.2 3.7-7.1 5-10.9 2.7z" fill="white"/>
        </svg>
        <div class="text-center">
          <p class="text-white font-semibold text-lg">Connect to Spotify</p>
          <p class="text-white/50 text-sm mt-1">Authorize to see what's playing</p>
        </div>
        <a
          href="/api/spotify/login"
          class="px-6 py-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold text-sm transition-colors"
        >
          Log in with Spotify
        </a>
      </WidgetCard>

      <!-- Player -->
      <WidgetCard v-else>
        <!-- Art + track info -->
        <div class="flex items-center gap-4">
          <div class="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-white/8">
            <img
              v-if="track?.album?.image"
              :src="track.album.image"
              :key="track.id"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-8 h-8 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
              </svg>
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-white font-semibold text-base leading-snug truncate">
              {{ track?.name ?? 'Nothing playing' }}
            </p>
            <p class="text-white/50 text-sm mt-0.5 truncate">
              {{ track ? track.artists.map(a => a.name).join(', ') : 'Open Spotify to start listening' }}
            </p>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="mt-4">
          <input
            type="range"
            :min="0"
            :max="durationMs || 1"
            :value="progressMs"
            :disabled="!track"
            class="seek-bar"
            :style="seekBarStyle"
            @mousedown="onSeekStart"
            @touchstart.passive="onSeekStart"
            @input="onSeekMove"
            @change="onSeekCommit"
          />
          <div class="flex justify-between mt-1.5 text-xs text-white/35 select-none">
            <span>{{ formatDuration(progressMs) }}</span>
            <span>{{ formatDuration(durationMs) }}</span>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center justify-center gap-5 mt-3">
          <button class="btn-icon" :disabled="!track" @click="skipPrevious" title="Previous">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/>
            </svg>
          </button>

          <button class="btn-primary" :disabled="!track" @click="togglePlay" :title="playing ? 'Pause' : 'Play'">
            <svg v-if="playing" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
            <svg v-else class="w-5 h-5 translate-x-px" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>

          <button class="btn-icon" :disabled="!track" @click="skipNext" title="Next">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2V6z"/>
            </svg>
          </button>
        </div>
      </WidgetCard>
    </WidgetStatus>
  </div>
</template>

<style scoped>
/* ── Seek bar (Spotify-specific styling) ── */
.seek-bar {
  -webkit-appearance: none;
  appearance: none;
  display: block;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  transition: height 0.15s ease;
}
.seek-bar:hover   { height: 5px; }
.seek-bar:disabled { opacity: 0.3; cursor: not-allowed; }

.seek-bar::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; }
.seek-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #fff;
  transform: scale(0);
  transition: transform 0.15s ease;
  margin-top: -4.5px;
}
.seek-bar:hover::-webkit-slider-thumb,
.seek-bar:active::-webkit-slider-thumb { transform: scale(1); }

.seek-bar::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border: none;
  border-radius: 50%;
  background: #fff;
  transform: scale(0);
  transition: transform 0.15s ease;
}
.seek-bar:hover::-moz-range-thumb,
.seek-bar:active::-moz-range-thumb { transform: scale(1); }
</style>

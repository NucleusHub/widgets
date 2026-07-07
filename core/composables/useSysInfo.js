import { ref, onMounted, onUnmounted } from 'vue'

// Shared singleton poller — all system widgets read one /api/sysinfo snapshot
// rather than each fetching independently. Polling is ref-counted so it stops
// when no widget is mounted (e.g. orbit collapsed / unmounted).
//
// Lives in the widget package (not a host app's src) so the system widgets are
// self-contained and build in any app that renders them, not just the hub.
const data = ref(null)
const POLL_MS = 2000

let timer = null
let consumers = 0

async function poll() {
  try {
    const res = await fetch('/api/sysinfo')
    if (res.ok) data.value = await res.json()
  } catch {
    /* keep last known snapshot */
  }
}

export function useSysInfo() {
  onMounted(() => {
    consumers++
    if (consumers === 1) {
      poll()
      timer = setInterval(poll, POLL_MS)
    } else if (!data.value) {
      poll()
    }
  })

  onUnmounted(() => {
    consumers--
    if (consumers === 0) {
      clearInterval(timer)
      timer = null
    }
  })

  return { data }
}

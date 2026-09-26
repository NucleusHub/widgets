import { ref, onMounted, onUnmounted } from 'vue'

const data = ref(null)
const POLL_MS = 2000

let timer = null
let consumers = 0

async function poll() {
  try {
    const res = await fetch('/api/sysinfo')
    if (res.ok) data.value = await res.json()
  } catch {}
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

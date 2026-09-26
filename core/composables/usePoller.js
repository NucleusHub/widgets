import { onUnmounted } from 'vue'

export function usePoller(fn, intervalMs, { immediate = true } = {}) {
  let timer = null

  function start() {
    stop()
    if (immediate) fn()
    timer = setInterval(fn, intervalMs)
  }

  function stop() {
    clearInterval(timer)
    timer = null
  }

  onUnmounted(stop)

  return { start, stop }
}

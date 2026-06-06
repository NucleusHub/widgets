import { onUnmounted } from 'vue'

/**
 * Runs `fn` on a fixed interval and cleans up automatically when the
 * component unmounts. Call `start()` when you are ready to begin polling
 * (e.g. after auth succeeds). Calling `start()` again resets the interval.
 *
 * @param {() => void} fn          - function to call on each tick
 * @param {number}     intervalMs  - milliseconds between ticks
 * @param {object}     [opts]
 * @param {boolean}    [opts.immediate=true] - call fn() once right when start() is invoked
 */
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

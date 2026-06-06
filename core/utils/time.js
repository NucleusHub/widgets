/**
 * Formats a millisecond duration as M:SS  (e.g. 3:07, 12:04)
 * Used by Spotify seek-bar labels, and any other widget showing a duration.
 */
export function formatDuration(ms) {
  const s = Math.floor((ms || 0) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

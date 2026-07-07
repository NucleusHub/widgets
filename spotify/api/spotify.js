const BASE = '/api/spotify'

async function req(method, path) {
  const res = await fetch(`${BASE}${path}`, { method })
  if (res.status === 204) return null
  return res.json()
}

export const getStatus     = ()   => req('GET',  '/status')
export const getNowPlaying = ()   => req('GET',  '/now-playing')
export const play          = ()   => req('PUT',  '/play')
export const pause         = ()   => req('PUT',  '/pause')
export const next          = ()   => req('POST', '/next')
export const previous      = ()   => req('POST', '/previous')
export const seek          = (ms) => req('PUT',  `/seek?position_ms=${Math.round(ms)}`)

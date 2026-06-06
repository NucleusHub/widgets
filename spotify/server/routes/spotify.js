import { Router } from 'express'

const router = Router()

const tokenStore = {
  accessToken: null,
  refreshToken: null,
  expiresAt: 0,
}

const SPOTIFY_API = 'https://api.spotify.com/v1'
const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com'
const SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state'

function clientCredentials() {
  return Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')
}

async function refreshAccessToken() {
  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${clientCredentials()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenStore.refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  const data = await res.json()
  tokenStore.accessToken = data.access_token
  tokenStore.expiresAt = Date.now() + data.expires_in * 1000
  if (data.refresh_token) tokenStore.refreshToken = data.refresh_token
}

async function getValidToken() {
  if (!tokenStore.refreshToken) throw new Error('Not authenticated')
  if (Date.now() >= tokenStore.expiresAt - 30_000) await refreshAccessToken()
  return tokenStore.accessToken
}

async function spotifyFetch(method, path) {
  const token = await getValidToken()
  return fetch(`${SPOTIFY_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  })
}

function handleControlRoute(method, spotifyPath) {
  return async (req, res) => {
    try {
      const r = await spotifyFetch(method, spotifyPath)
      res.status(r.status === 204 ? 204 : r.ok ? 200 : r.status).end()
    } catch (err) {
      res.status(err.message === 'Not authenticated' ? 401 : 500).json({ error: err.message })
    }
  }
}

// GET /api/spotify/login
router.get('/login', (req, res) => {
  const returnTo = req.headers.referer || process.env.SPOTIFY_SUCCESS_REDIRECT || '/'
  const state = Buffer.from(returnTo).toString('base64url')
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    scope: SCOPES,
    state,
  })
  res.redirect(`${SPOTIFY_ACCOUNTS}/authorize?${params}`)
})

// GET /api/spotify/callback
router.get('/callback', async (req, res) => {
  const { code, error, state } = req.query
  if (error || !code) {
    return res.status(400).json({ error: error || 'Missing authorization code' })
  }
  try {
    const tokenRes = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${clientCredentials()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      }),
    })
    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      return res.status(502).json({ error: 'Token exchange failed', detail: body })
    }
    const data = await tokenRes.json()
    tokenStore.accessToken = data.access_token
    tokenStore.refreshToken = data.refresh_token
    tokenStore.expiresAt = Date.now() + data.expires_in * 1000
    let returnTo = process.env.SPOTIFY_SUCCESS_REDIRECT || '/'
    if (state) {
      try { returnTo = Buffer.from(state, 'base64url').toString() } catch {}
    }
    res.redirect(returnTo)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/spotify/now-playing
router.get('/now-playing', async (req, res) => {
  try {
    const token = await getValidToken()
    const spotifyRes = await fetch(`${SPOTIFY_API}/me/player/currently-playing`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (spotifyRes.status === 204) return res.json({ playing: false })
    if (!spotifyRes.ok) return res.status(spotifyRes.status).json({ error: 'Spotify API error' })
    const data = await spotifyRes.json()
    if (!data || !data.item) return res.json({ playing: false })
    const track = data.item
    res.json({
      playing: data.is_playing,
      track: {
        id: track.id,
        name: track.name,
        artists: track.artists.map((a) => ({ id: a.id, name: a.name })),
        album: {
          id: track.album?.id ?? null,
          name: track.album?.name ?? null,
          image: track.album?.images?.[0]?.url ?? null,
        },
        duration_ms: track.duration_ms,
        progress_ms: data.progress_ms,
        isLocal: track.is_local,
        externalUrl: track.external_urls?.spotify ?? null,
      },
    })
  } catch (err) {
    res.status(err.message === 'Not authenticated' ? 401 : 500).json({ error: err.message })
  }
})

// GET /api/spotify/status
router.get('/status', (req, res) => {
  res.json({ authenticated: tokenStore.refreshToken !== null })
})

// Playback controls
router.put('/play',     handleControlRoute('PUT',  '/me/player/play'))
router.put('/pause',    handleControlRoute('PUT',  '/me/player/pause'))
router.post('/next',     handleControlRoute('POST', '/me/player/next'))
router.post('/previous', handleControlRoute('POST', '/me/player/previous'))

router.put('/seek', async (req, res) => {
  const { position_ms } = req.query
  if (position_ms === undefined) return res.status(400).json({ error: 'position_ms required' })
  try {
    const r = await spotifyFetch('PUT', `/me/player/seek?position_ms=${position_ms}`)
    res.status(r.status === 204 ? 204 : r.ok ? 200 : r.status).end()
  } catch (err) {
    res.status(err.message === 'Not authenticated' ? 401 : 500).json({ error: err.message })
  }
})

export default router

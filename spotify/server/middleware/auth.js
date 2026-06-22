import crypto from 'crypto'

// Same shared secret the Nucleus auth-server signs sessions with. Falls back to
// the same default the rest of the stack uses so dev works out of the box.
const secret = () => process.env.JWT_SECRET || 'nucleus-jwt-secret'

// Read one cookie from the raw Cookie header without pulling in a dependency
// (this service is built with `npm ci`, so adding packages means a lockfile +
// volume rebuild — not worth it for a single cookie + an HMAC check).
function readCookie(header, name) {
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) {
      try { return decodeURIComponent(part.slice(eq + 1).trim()) } catch { return null }
    }
  }
  return null
}

// Verify a Nucleus JWT (HS256, the jsonwebtoken default for a string secret).
// Throws on any malformed / bad-signature / expired token.
function verifyJwt(token) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('malformed token')
  const [header, payload, sig] = parts
  const expected = crypto
    .createHmac('sha256', secret())
    .update(`${header}.${payload}`)
    .digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('bad signature')
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (claims.exp && Date.now() / 1000 >= claims.exp) throw new Error('expired')
  return claims
}

// Gate the Spotify proxy behind the nucleus_token cookie. Without this, anyone
// who can reach the host can read and control the owner's Spotify account, since
// the OAuth token store is a single process-global object.
export function requireAuth(req, res, next) {
  const token = readCookie(req.headers.cookie, 'nucleus_token')
  if (!token) return res.status(401).json({ error: 'Unauthenticated' })
  try {
    verifyJwt(token)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

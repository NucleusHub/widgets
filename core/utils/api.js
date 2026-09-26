export function createApiClient(baseUrl) {
  async function req(method, path) {
    const res = await fetch(`${baseUrl}${path}`, { method })
    if (res.status === 204) return null
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${method} ${path} → ${res.status}${text ? ': ' + text : ''}`)
    }
    return res.json()
  }

  return { req }
}

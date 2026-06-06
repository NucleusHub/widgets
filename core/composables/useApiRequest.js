import { ref } from 'vue'

/**
 * Wraps an async call with reactive loading/error state.
 *
 * Usage:
 *   const { loading, error, request } = useApiRequest()
 *   const data = await request(() => fetchSomething())
 */
export function useApiRequest() {
  const loading = ref(false)
  const error   = ref(null)

  async function request(fn) {
    loading.value = true
    error.value   = null
    try {
      return await fn()
    } catch (e) {
      error.value = e?.message ?? 'Request failed'
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, error, request }
}

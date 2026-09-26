import { ref } from 'vue'

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

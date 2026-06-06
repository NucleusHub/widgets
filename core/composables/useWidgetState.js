import { ref, computed } from 'vue'

/**
 * Standard status machine for any widget.
 * Status values: 'loading' | 'ready' | 'error' | 'unauthenticated'
 */
export function useWidgetState(initial = 'loading') {
  const status   = ref(initial)
  const errorMsg = ref(null)

  return {
    status,
    errorMsg,
    isLoading:         computed(() => status.value === 'loading'),
    isReady:           computed(() => status.value === 'ready'),
    isError:           computed(() => status.value === 'error'),
    isUnauthenticated: computed(() => status.value === 'unauthenticated'),

    setLoading()         { status.value = 'loading';        errorMsg.value = null },
    setReady()           { status.value = 'ready';          errorMsg.value = null },
    setError(msg)        { status.value = 'error';          errorMsg.value = msg ?? 'Something went wrong' },
    setUnauthenticated() { status.value = 'unauthenticated'; errorMsg.value = null },
  }
}

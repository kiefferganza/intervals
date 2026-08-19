export function useWakeLock() {
  const isActive = ref(false)
  let sentinel: WakeLockSentinel | null = null

  async function acquire() {
    if (!('wakeLock' in navigator)) return
    try {
      sentinel = await (navigator as Navigator & { wakeLock: WakeLock }).wakeLock.request('screen')
      isActive.value = true
      sentinel?.addEventListener('release', () => {
        isActive.value = false
      })
    } catch {
      isActive.value = false
    }
  }

  async function release() {
    if (sentinel) {
      await sentinel.release()
      sentinel = null
    }
    isActive.value = false
  }

  return { isActive, acquire, release }
}

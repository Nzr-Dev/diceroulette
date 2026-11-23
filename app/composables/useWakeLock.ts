/**
 * Keeps the screen on while the person plays (so the phone does not go dark on the table).
 * The choice is remembered on this device. Browsers that cannot do it just hide the switch.
 */
const KEY = 'diceroulette:keepAwake'

export function useWakeLock() {
  const supported = ref(false)
  const active = ref(false)
  let sentinel: WakeLockSentinel | null = null

  function remembered(): boolean {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  }
  function remember(value: boolean) {
    try {
      localStorage.setItem(KEY, value ? '1' : '0')
    } catch {
      /* private mode: it just will not be remembered */
    }
  }

  async function acquire() {
    try {
      sentinel = await navigator.wakeLock.request('screen')
      sentinel.addEventListener('release', () => (sentinel = null))
      active.value = true
    } catch {
      active.value = false // low battery, or not allowed right now
    }
  }
  async function release() {
    try {
      await sentinel?.release()
    } finally {
      sentinel = null
      active.value = false
    }
  }

  async function toggle() {
    if (active.value) {
      remember(false)
      await release()
    } else {
      remember(true)
      await acquire()
    }
  }

  // The system drops the lock when the tab is hidden; take it again when it comes back.
  function onVisible() {
    if (document.visibilityState === 'visible' && remembered() && !sentinel) void acquire()
  }

  onMounted(() => {
    supported.value = 'wakeLock' in navigator
    if (!supported.value) return
    document.addEventListener('visibilitychange', onVisible)
    if (remembered()) void acquire()
  })
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisible)
    void release()
  })

  return { supported, active, toggle }
}

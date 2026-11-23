// One shared clock for every timer on screen (instead of one interval per card).
const now = ref(Date.now())
let users = 0
let handle: ReturnType<typeof setInterval> | undefined

/** Current time in ms, refreshed 4 times a second while at least one component uses it. */
export function useNow() {
  onMounted(() => {
    users++
    now.value = Date.now()
    handle ??= setInterval(() => (now.value = Date.now()), 250)
  })
  onBeforeUnmount(() => {
    users--
    if (users === 0 && handle) {
      clearInterval(handle)
      handle = undefined
    }
  })
  return now
}

/**
 * For the + and − buttons: one step on press, and while held, repeated steps that get
 * bigger after a while (multiplier 10 after about 2.5 seconds).
 */
export function useHoldRepeat(action: (multiplier: number) => void) {
  let delay: ReturnType<typeof setTimeout> | undefined
  let repeat: ReturnType<typeof setInterval> | undefined
  let count = 0

  function stop() {
    clearTimeout(delay)
    clearInterval(repeat)
  }

  function start() {
    stop()
    count = 0
    action(1)
    delay = setTimeout(() => {
      repeat = setInterval(() => {
        count++
        action(count > 20 ? 10 : 1)
      }, 120)
    }, 450)
  }

  onBeforeUnmount(stop)
  return { start, stop }
}

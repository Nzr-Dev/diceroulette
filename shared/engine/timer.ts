import type { TimerElement } from '../schemas'

/**
 * Timer logic without any clock of its own: the caller passes the current time in
 * milliseconds (Date.now()). That makes it easy to test, and the timer stays correct
 * even if the browser slows down a background tab.
 */

/** Time elapsed so far, including the current run. */
export function timerElapsedMs(timer: TimerElement, nowMs: number): number {
  const currentRun =
    timer.status === 'running' && timer.startedAt !== null ? Math.max(0, nowMs - Date.parse(timer.startedAt)) : 0
  return timer.elapsedMs + currentRun
}

/** What the screen shows: time left in a countdown, time elapsed in a stopwatch. */
export function timerDisplayMs(timer: TimerElement, nowMs: number): number {
  const elapsed = timerElapsedMs(timer, nowMs)
  if (timer.mode === 'stopwatch') return elapsed
  return Math.max(0, (timer.durationSeconds ?? 0) * 1000 - elapsed)
}

export function startTimer(timer: TimerElement, nowMs: number): TimerElement {
  if (timer.status === 'running' || timer.status === 'finished') return timer
  return { ...timer, status: 'running', startedAt: new Date(nowMs).toISOString() }
}

export function pauseTimer(timer: TimerElement, nowMs: number): TimerElement {
  if (timer.status !== 'running') return timer
  return { ...timer, status: 'paused', elapsedMs: timerElapsedMs(timer, nowMs), startedAt: null }
}

export function resetTimer(timer: TimerElement): TimerElement {
  return { ...timer, status: 'idle', elapsedMs: 0, startedAt: null }
}

/** Call it on every tick: marks a countdown as finished when its time is up. */
export function tickTimer(timer: TimerElement, nowMs: number): TimerElement {
  if (timer.mode === 'countdown' && timer.status === 'running' && timerDisplayMs(timer, nowMs) <= 0) {
    return { ...timer, status: 'finished', elapsedMs: (timer.durationSeconds ?? 0) * 1000, startedAt: null }
  }
  return timer
}

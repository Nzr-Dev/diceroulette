import { z } from 'zod'
import { LIMITS } from './limits'
import { isoDateSchema } from './common'

export const TIMER_MODES = ['countdown', 'stopwatch'] as const
export const TIMER_STATUSES = ['idle', 'running', 'paused', 'finished'] as const

/** Fields specific to the timer type (the common ones are in element.ts). */
export const timerFields = {
  /** countdown = timer that counts down, stopwatch = counts up. */
  mode: z.enum(TIMER_MODES).default('countdown'),
  /** Only for the countdown. */
  durationSeconds: z.int().min(1).max(LIMITS.maxTimerSeconds).optional(),
  status: z.enum(TIMER_STATUSES).default('idle'),
  /** Time accumulated before the current run, in milliseconds. */
  elapsedMs: z.number().min(0).default(0),
  /** When the current run started. Null if it is not running. */
  startedAt: isoDateSchema.nullable().default(null),
}

/** Cross-field rules that apply to the whole timer. */
export function checkTimer(
  timer: { mode: string; durationSeconds?: number; status: string; startedAt: string | null },
  ctx: z.RefinementCtx,
): void {
  if (timer.mode === 'countdown' && timer.durationSeconds === undefined) {
    ctx.addIssue({ code: 'custom', path: ['durationSeconds'], message: 'a countdown needs a duration' })
  }
  if (timer.status === 'running' && timer.startedAt === null) {
    ctx.addIssue({ code: 'custom', path: ['startedAt'], message: 'a running timer needs startedAt' })
  }
}

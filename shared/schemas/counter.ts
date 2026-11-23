import { z } from 'zod'
import { LIMITS } from './limits'
import { colorSchema, idSchema, labelSchema } from './common'

/** Alert shown when the counter reaches a value, for example 0. */
export const counterAlertSchema = z.object({
  id: idSchema,
  value: z.number(),
  message: labelSchema.default(''),
  color: colorSchema.optional(),
})

/** Fields specific to the counter type (the common ones are in element.ts). */
export const counterFields = {
  value: z.number().default(0),
  initial: z.number().default(0),
  /** Null means no limit. */
  min: z.number().nullable().default(null),
  max: z.number().nullable().default(null),
  step: z.number().positive().default(1),
  allowNegative: z.boolean().default(true),
  allowDecimals: z.boolean().default(false),
  alerts: z.array(counterAlertSchema).max(LIMITS.maxAlertsPerCounter).default([]),
  /** 180 turns the counter upside down for players sitting opposite each other. */
  rotation: z.union([z.literal(0), z.literal(180)]).default(0),
}

/** Cross-field rules that apply to the whole counter. */
export function checkCounter(
  counter: { value: number; min: number | null; max: number | null; allowNegative: boolean; allowDecimals: boolean },
  ctx: z.RefinementCtx,
): void {
  const { value, min, max, allowNegative, allowDecimals } = counter
  if (min !== null && max !== null && min > max) {
    ctx.addIssue({ code: 'custom', path: ['min'], message: 'min cannot be greater than max' })
  }
  if (min !== null && value < min) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'value is below min' })
  }
  if (max !== null && value > max) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'value is above max' })
  }
  if (!allowNegative && value < 0) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'negative values are not allowed' })
  }
  if (!allowDecimals && !Number.isInteger(value)) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'decimal values are not allowed' })
  }
}

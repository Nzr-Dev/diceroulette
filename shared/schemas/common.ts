import { z } from 'zod'
import { LIMITS } from './limits'

/** UUID generated on the device (crypto.randomUUID). */
export const idSchema = z.uuid()

/** Date as an ISO 8601 string in UTC, for example 2026-11-19T20:00:00.000Z. */
export const isoDateSchema = z.iso.datetime()

/** Colors are stored as #RRGGBB. Never free text, so nothing can be injected into CSS. */
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a color like #RRGGBB')

export const nameSchema = z.string().trim().min(1).max(LIMITS.maxNameLength)
export const labelSchema = z.string().max(LIMITS.maxNameLength)
export const iconSchema = z.string().max(LIMITS.maxIconLength)
export const emojiSchema = z.string().max(LIMITS.maxEmojiLength)

/**
 * Silhouettes are SVG, but only parameters are stored (shape, color, border),
 * never SVG code. The app draws the SVG, so an imported file cannot carry scripts.
 */
export const SHAPES = ['square', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon'] as const

export const appearanceSchema = z.object({
  shape: z.enum(SHAPES).default('square'),
  color: colorSchema.optional(),
  borderColor: colorSchema.optional(),
  /** Border width in pixels. */
  borderWidth: z.number().min(0).max(8).default(2),
})

/** Result as an integer (rounded up or down) or as a decimal with 1 to 4 decimals. */
export const numberFormatSchema = z.object({
  mode: z.enum(['integer', 'decimal']).default('integer'),
  /** Only used in integer mode. */
  rounding: z.enum(['up', 'down']).default('down'),
  /** Only used in decimal mode. */
  decimals: z.int().min(1).max(4).default(2),
})

export type Shape = (typeof SHAPES)[number]

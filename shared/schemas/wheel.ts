import { z } from 'zod'
import { LIMITS } from './limits'
import { colorSchema, emojiSchema, iconSchema, idSchema, isoDateSchema, labelSchema } from './common'

export const sectorSchema = z.object({
  id: idSchema,
  label: labelSchema,
  /** Relative weight: a sector with weight 2 comes out twice as often as one with weight 1. */
  weight: z.number().positive().max(1000).default(1),
  icon: iconSchema.optional(),
  emoji: emojiSchema.optional(),
  color: colorSchema.optional(),
})

/** Fields specific to the wheel type (the common ones are in element.ts). */
export const wheelFields = {
  sectors: z.array(sectorSchema).min(1).max(LIMITS.maxSectorsPerWheel),
  /** When true, the sector that comes out is removed until the user resets the wheel. */
  noRepeat: z.boolean().default(false),
  usedSectorIds: z.array(idSchema).max(LIMITS.maxSectorsPerWheel).default([]),
  borderColor: colorSchema.optional(),
  lastResult: z.object({ at: isoDateSchema, sectorId: idSchema, label: labelSchema }).optional(),
}

export type Sector = z.infer<typeof sectorSchema>

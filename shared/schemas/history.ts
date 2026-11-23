import { z } from 'zod'
import { idSchema, isoDateSchema, nameSchema } from './common'
import { lastRollSchema } from './dice'
import { wheelResultSchema } from './wheel'

const base = {
  tableId: idSchema,
  at: isoDateSchema,
  elementId: idSchema,
  /** Name of the element at the moment of the roll. */
  elementName: nameSchema,
  /** Free text, no player profiles: whoever the user typed. */
  player: nameSchema.optional(),
}

/**
 * One line of the history. The history lives only on the device, in its own
 * local store, outside the table JSON (so it is never exported or synced).
 */
export const historyEntrySchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('dice'), roll: lastRollSchema }),
  z.object({ ...base, kind: z.literal('wheel'), result: wheelResultSchema }),
])

export type HistoryEntry = z.infer<typeof historyEntrySchema>

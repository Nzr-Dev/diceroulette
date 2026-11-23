import { z } from 'zod'
import { LIMITS, jsonSizeBytes } from './limits'
import { idSchema, isoDateSchema, nameSchema } from './common'
import { elementSchema } from './element'

/** Current version of the table format. It goes up every time the format changes. */
export const CURRENT_SCHEMA_VERSION = 1

export const tableSchema = z
  .object({
    id: idSchema,
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    name: nameSchema,
    /** True for the quick table on the home page. */
    isQuick: z.boolean().default(false),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    /** Soft delete: lets the user undo and lets the deletion sync between devices. */
    deletedAt: isoDateSchema.nullable().default(null),
    elements: z.array(elementSchema).max(LIMITS.maxElementsPerTable).default([]),
  })
  .superRefine((table, ctx) => {
    const seen = new Set<string>()
    table.elements.forEach((element, index) => {
      if (seen.has(element.id)) {
        ctx.addIssue({ code: 'custom', path: ['elements', index, 'id'], message: 'duplicated element id' })
      }
      seen.add(element.id)
    })
  })

export type GameTable = z.infer<typeof tableSchema>

export type ParseTableResult = { success: true; data: GameTable } | { success: false; error: string }

/**
 * Validates an unknown value (for example a parsed JSON file) as a table.
 * Also rejects tables that are bigger than the limit.
 * Unknown fields are dropped.
 */
export function parseTable(input: unknown): ParseTableResult {
  const result = tableSchema.safeParse(input)
  if (!result.success) {
    return { success: false, error: z.prettifyError(result.error) }
  }
  if (jsonSizeBytes(result.data) > LIMITS.maxTableBytes) {
    return { success: false, error: 'The table is too big' }
  }
  return { success: true, data: result.data }
}

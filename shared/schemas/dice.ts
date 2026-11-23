import { z } from 'zod'
import { LIMITS, MAX_EXCLUDED_IDS } from './limits'
import {
  appearanceSchema,
  colorSchema,
  emojiSchema,
  iconSchema,
  idSchema,
  isoDateSchema,
  labelSchema,
  numberFormatSchema,
} from './common'

/** One face of a die: a label to show and an optional number to operate with. */
export const faceSchema = z.object({
  id: idSchema,
  label: labelSchema,
  /** Without a value, the face is only shown and does not take part in operations. */
  value: z.number().optional(),
  icon: iconSchema.optional(),
  emoji: emojiSchema.optional(),
  color: colorSchema.optional(),
})

/** A group of identical dice, for example 2d6 = count 2 with six faces. */
export const diceGroupSchema = z.object({
  id: idSchema,
  count: z.int().min(1).max(LIMITS.maxDicePerGroup),
  faces: z.array(faceSchema).min(1).max(LIMITS.maxFacesPerDie),
})

/** Fixed modifier, added and removed by hand by the user. */
export const modifierSchema = z.object({
  id: idSchema,
  label: labelSchema.default(''),
  value: z.number(),
})

export const OPERATIONS = ['sum', 'subtract', 'multiply', 'divide', 'max', 'min', 'average'] as const

export const WINNER_MODES = ['highest', 'lowest', 'success'] as const

const toggleWithValueSchema = z.object({
  enabled: z.boolean().default(false),
  /** Without a value, the highest face (critical) or the lowest face (fumble) is used. */
  value: z.number().optional(),
})

export const highlightsSchema = z.object({
  winner: z
    .object({
      enabled: z.boolean().default(false),
      mode: z.enum(WINNER_MODES).default('highest'),
    })
    .prefault({}),
  /** Target number for the «success» mode and for comparing against a difficulty. */
  difficulty: z.number().optional(),
  critical: toggleWithValueSchema.prefault({}),
  fumble: toggleWithValueSchema.prefault({}),
})

/** Exclusion: an option that already came out cannot come out again until the user resets it. */
export const exclusionSchema = z.object({
  enabled: z.boolean().default(false),
  /** Faces already drawn, shared by all the groups of the element (like drawing from a bag). */
  usedFaceIds: z.array(idSchema).max(MAX_EXCLUDED_IDS).default([]),
})

/** Last result, kept as text so editing the die later does not change it. */
export const lastRollSchema = z.object({
  at: isoDateSchema,
  results: z
    .array(
      z.object({
        groupId: idSchema,
        faceId: idSchema,
        label: labelSchema,
        value: z.number().optional(),
      }),
    )
    .max(LIMITS.maxGroupsPerElement * LIMITS.maxDicePerGroup),
  /** Final result after operations and modifiers. Null if no face has a numeric value. */
  total: z.number().nullable(),
})

/** Fields specific to the dice type (the common ones are in element.ts). */
export const diceFields = {
  groups: z.array(diceGroupSchema).min(1).max(LIMITS.maxGroupsPerElement),
  modifiers: z.array(modifierSchema).max(LIMITS.maxModifiersPerElement).default([]),
  operation: z.enum(OPERATIONS).default('sum'),
  numberFormat: numberFormatSchema.prefault({}),
  highlights: highlightsSchema.prefault({}),
  exclusion: exclusionSchema.prefault({}),
  appearance: appearanceSchema.prefault({}),
  lastRoll: lastRollSchema.optional(),
}

export type Face = z.infer<typeof faceSchema>
export type DiceGroup = z.infer<typeof diceGroupSchema>
export type Modifier = z.infer<typeof modifierSchema>
export type Operation = (typeof OPERATIONS)[number]

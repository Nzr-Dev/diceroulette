import { z } from 'zod'
import { colorSchema, emojiSchema, iconSchema, idSchema, nameSchema } from './common'
import { diceFields } from './dice'
import { wheelFields } from './wheel'
import { counterFields, checkCounter } from './counter'
import { timerFields, checkTimer } from './timer'

export const ELEMENT_TYPES = ['dice', 'wheel', 'counter', 'timer'] as const

/** Fields every element has, whatever its type. */
const baseFields = {
  id: idSchema,
  name: nameSchema,
  /** A disabled element is skipped by «Roll all» and does not work until enabled again. */
  enabled: z.boolean().default(true),
  color: colorSchema.optional(),
  icon: iconSchema.optional(),
  emoji: emojiSchema.optional(),
}

export const diceElementSchema = z.object({ ...baseFields, type: z.literal('dice'), ...diceFields })
export const wheelElementSchema = z.object({ ...baseFields, type: z.literal('wheel'), ...wheelFields })
export const counterElementSchema = z
  .object({ ...baseFields, type: z.literal('counter'), ...counterFields })
  .superRefine(checkCounter)
export const timerElementSchema = z
  .object({ ...baseFields, type: z.literal('timer'), ...timerFields })
  .superRefine(checkTimer)

/** Any element of a table. The `type` field decides which schema applies. */
export const elementSchema = z.discriminatedUnion('type', [
  diceElementSchema,
  wheelElementSchema,
  counterElementSchema,
  timerElementSchema,
])

export type DiceElement = z.infer<typeof diceElementSchema>
export type WheelElement = z.infer<typeof wheelElementSchema>
export type CounterElement = z.infer<typeof counterElementSchema>
export type TimerElement = z.infer<typeof timerElementSchema>
export type Element = z.infer<typeof elementSchema>
export type ElementType = (typeof ELEMENT_TYPES)[number]

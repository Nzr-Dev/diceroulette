import { z } from 'zod'
import { LIMITS } from './limits'

export const LOCALES = ['es', 'ca', 'en', 'pt-BR', 'pt-PT', 'fr', 'de', 'it', 'pl', 'ru', 'uk', 'el'] as const
export const THEMES = ['dark', 'light'] as const

/** Preferences of this device. Dark is the default theme. */
export const settingsSchema = z.object({
  theme: z.enum(THEMES).default('dark'),
  /** Null = not chosen yet, use the browser language. */
  locale: z.enum(LOCALES).nullable().default(null),
  historyLimit: z.int().min(1).max(1000).default(LIMITS.defaultHistoryEntries),
})

export type Settings = z.infer<typeof settingsSchema>
export type Locale = (typeof LOCALES)[number]

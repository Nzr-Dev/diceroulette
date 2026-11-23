import { settingsSchema, type Settings } from '#shared/schemas'
import type { DiceRouletteDb } from './database'

/** Preferences of this device. Wrong or missing values fall back to the defaults. */
export async function getSettings(db: DiceRouletteDb): Promise<Settings> {
  const row = await db.settings.get('settings')
  const parsed = settingsSchema.safeParse(row?.value ?? {})
  return parsed.success ? parsed.data : settingsSchema.parse({})
}

export async function updateSettings(db: DiceRouletteDb, changes: Partial<Settings>): Promise<Settings> {
  const next = settingsSchema.parse({ ...(await getSettings(db)), ...changes })
  await db.settings.put({ key: 'settings', value: next })
  return next
}

import { DiceRouletteDb } from './database'

export * from './database'
export * from './tablesRepo'
export * from './historyRepo'
export * from './settingsRepo'

let instance: DiceRouletteDb | undefined

/** The one database of the app. IndexedDB only exists in the browser, so call this on the client. */
export function useDb(): DiceRouletteDb {
  instance ??= new DiceRouletteDb()
  return instance
}

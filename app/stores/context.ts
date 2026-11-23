import { useDb, type DiceRouletteDb } from '../db'

let override: DiceRouletteDb | undefined

/** Lets tests use their own database. In the app it is never called. */
export function setDb(db: DiceRouletteDb | undefined): void {
  override = db
}

export function getDb(): DiceRouletteDb {
  return override ?? useDb()
}

/** Plain copy of reactive data: engine and database must never receive Vue proxies. */
export function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

import Dexie, { type EntityTable } from 'dexie'
import type { GameTable, HistoryEntry, Settings } from '../../shared/schemas'

/** Sync bookkeeping of a table. Kept apart from the table so it is never exported. */
export interface TableMeta {
  id: string
  /** Revision number given by the server at the last sync. Null if it never synced. */
  serverRevision: number | null
  /** True when the table changed on this device since the last sync. */
  dirty: boolean
}

export type HistoryRow = HistoryEntry & { id: number }
export interface SettingsRow {
  key: 'settings'
  value: Partial<Settings>
}

/** Local database (IndexedDB). Everything works without an account. */
export class DiceRouletteDb extends Dexie {
  // `tables` is already a Dexie property, hence `gameTables`.
  gameTables!: EntityTable<GameTable, 'id'>
  tableMeta!: EntityTable<TableMeta, 'id'>
  history!: EntityTable<HistoryRow, 'id'>
  settings!: EntityTable<SettingsRow, 'key'>

  constructor(name = 'diceroulette') {
    super(name)
    this.version(1).stores({
      gameTables: 'id, updatedAt, deletedAt',
      tableMeta: 'id',
      history: '++id, [tableId+id]',
      settings: 'key',
    })
  }
}

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GameTable } from '#shared/schemas'
import {
  createTable, deleteTable, duplicateTable, exportTable, importTable, listDeletedTables, listTables,
  purgeDeletedTables, renameTable, undoDeleteTable, type SaveResult,
} from '../db'
import { getDb } from './context'

/** The library: the list of tables of this device. */
export const useLibraryStore = defineStore('library', () => {
  const tables = ref<GameTable[]>([])
  const trash = ref<GameTable[]>([])
  /** The table deleted last, so the «Undo» button knows what to bring back. */
  const lastDeletedId = ref<string | null>(null)

  async function load(): Promise<void> {
    const db = getDb()
    await purgeDeletedTables(db)
    tables.value = await listTables(db)
    trash.value = await listDeletedTables(db)
  }

  async function run(action: () => Promise<SaveResult>): Promise<SaveResult> {
    const result = await action()
    await load()
    return result
  }

  const create = (name: string) => run(() => createTable(getDb(), name))
  const duplicate = (id: string, name: string) => run(() => duplicateTable(getDb(), id, { name }))
  const importFromText = (text: string) => run(() => importTable(getDb(), text))
  const rename = (id: string, name: string) => run(() => renameTable(getDb(), id, name))
  const exportJson = (id: string) => exportTable(getDb(), id)

  async function remove(id: string): Promise<boolean> {
    const done = await deleteTable(getDb(), id)
    if (done) lastDeletedId.value = id
    await load()
    return done
  }

  /** «Undo» of the last deletion, or of a given table from the trash. */
  async function undoRemove(id: string | null = lastDeletedId.value): Promise<boolean> {
    if (!id) return false
    const done = await undoDeleteTable(getDb(), id)
    if (done && id === lastDeletedId.value) lastDeletedId.value = null
    await load()
    return done
  }

  return { tables, trash, lastDeletedId, load, create, duplicate, importFromText, rename, exportJson, remove, undoRemove }
})

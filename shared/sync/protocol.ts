import { z } from 'zod'
import { idSchema } from '../schemas/common'
import { tableSchema, type GameTable } from '../schemas/table'

/**
 * Sync protocol between a device and the server.
 *
 * - The server keeps ONE counter per account. Every time a table is saved, it gets the next
 *   number as its `revision`. A device remembers the highest number it has seen (`cursor`),
 *   so «what changed since I last asked?» is simply «revision > cursor».
 * - A device sends the revision it last saw of each table (`baseRevision`). If the server has a
 *   newer one, somebody else changed the table first: that is a conflict.
 * - Conflicts never lose data: the server version wins and the device keeps its own version as a copy.
 */

/** Most tables a device sends in one request (the request body also has a size limit). */
export const MAX_CHANGES_PER_REQUEST = 20
/** Most tables the server returns in one response; the device asks again while `hasMore` is true. */
export const MAX_REMOTE_PER_RESPONSE = 20

export const changeSchema = z.object({
  id: idSchema,
  /** Revision of this table the device last saw, or null if it never synced it. */
  baseRevision: z.number().int().nonnegative().nullable(),
  /** The table as JSON. It is validated again on the server; a deleted table carries `deletedAt`. */
  table: z.unknown(),
})
export type Change = z.infer<typeof changeSchema>

export const syncRequestSchema = z.object({
  cursor: z.number().int().nonnegative(),
  changes: z.array(changeSchema).max(MAX_CHANGES_PER_REQUEST),
})
export type SyncRequest = z.infer<typeof syncRequestSchema>

export type ConflictReason =
  /** The server has a newer version. */
  | 'stale'
  /** The table is bigger than the limit per table. */
  | 'tooBig'
  /** The account would go over its storage limit. */
  | 'quota'
  /** Not a valid table. */
  | 'invalid'

export interface RemoteTable {
  revision: number
  table: GameTable
}

export type SyncResponse = {
  /** Tables the server accepted, with their new revision. */
  applied: { id: string; revision: number }[]
  /** Tables the server did not accept. For `stale`, `server` is the version that won. */
  conflicts: { id: string; reason: ConflictReason; server?: RemoteTable }[]
  /** Tables changed on the server since the cursor (the ones just applied are not repeated). */
  remote: RemoteTable[]
  /** New cursor to send next time. */
  cursor: number
  /** True if there are more changes to download: ask again. */
  hasMore: boolean
}

export { tableSchema }

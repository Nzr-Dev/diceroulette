import type { GameTable } from '#shared/schemas'
import type { StoredTable, SyncStore, SyncTx } from '#shared/sync'
import type { Prisma, PrismaClient } from '../generated/prisma/client'

function makeTx(db: Prisma.TransactionClient): SyncTx {
  return {
    async getTable(userId, id) {
      const row = await db.syncTable.findUnique({ where: { id } })
      if (!row) return { stored: null, taken: false }
      if (row.userId !== userId) return { stored: null, taken: true }
      const stored: StoredTable = { id: row.id, revision: row.revision, sizeBytes: row.sizeBytes, table: row.data as unknown as GameTable }
      return { stored, taken: false }
    },
    async totalBytes(userId) {
      const sum = await db.syncTable.aggregate({ where: { userId }, _sum: { sizeBytes: true } })
      return sum._sum.sizeBytes ?? 0
    },
    async nextRevision(userId) {
      const user = await db.user.update({ where: { id: userId }, data: { syncCounter: { increment: 1 } }, select: { syncCounter: true } })
      return user.syncCounter
    },
    async currentRevision(userId) {
      const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { syncCounter: true } })
      return user.syncCounter
    },
    async putTable(userId, stored) {
      const data = {
        userId,
        revision: stored.revision,
        sizeBytes: stored.sizeBytes,
        data: stored.table as unknown as Prisma.InputJsonValue,
        deletedAt: stored.table.deletedAt ? new Date(stored.table.deletedAt) : null,
      }
      await db.syncTable.upsert({ where: { id: stored.id }, create: { id: stored.id, ...data }, update: data })
    },
    async listSince(userId, cursor, limit) {
      const rows = await db.syncTable.findMany({ where: { userId, revision: { gt: cursor } }, orderBy: { revision: 'asc' }, take: limit })
      return rows.map((row) => ({ id: row.id, revision: row.revision, sizeBytes: row.sizeBytes, table: row.data as unknown as GameTable }))
    },
    async purgeDeleted(userId, before) {
      await db.syncTable.deleteMany({ where: { userId, deletedAt: { lt: new Date(before) } } })
    },
  }
}

/** SyncStore on Postgres. Each sync is one transaction that first locks the account row. */
export function createPrismaSyncStore(prisma: PrismaClient): SyncStore {
  return {
    transaction: (userId, fn) =>
      prisma.$transaction(
        async (db) => {
          // Row lock: a second sync of the same account waits here until this one ends.
          await db.$queryRaw`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`
          return fn(makeTx(db))
        },
        { timeout: 20_000 },
      ),
  }
}

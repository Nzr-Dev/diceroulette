import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../generated/prisma/client'

/**
 * One Prisma client per server instance. It talks to Neon through the pooled address
 * (DATABASE_URL, the one with «-pooler»). Nothing here ever runs in the browser.
 */
let client: PrismaClient | undefined

export function usePrisma(): PrismaClient {
  if (!client) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')
    client = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })
  }
  return client
}

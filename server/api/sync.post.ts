import { syncRequestSchema, applySync } from '#shared/sync'
import { useAuth } from '../utils/auth'
import { usePrisma } from '../utils/prisma'
import { createPrismaSyncStore } from '../utils/syncStore'

/** Vercel rejects bodies over 4.5 MB; stay under it and answer clearly. */
const MAX_BODY_BYTES = 4_000_000

export default defineEventHandler(async (event) => {
  // Who is asking comes from the session cookie only, never from the body.
  const session = await useAuth().api.getSession({ headers: event.headers })
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })

  if (!(getRequestHeader(event, 'content-type') ?? '').includes('application/json')) {
    throw createError({ statusCode: 415, statusMessage: 'Expected JSON' })
  }
  const length = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (length > MAX_BODY_BYTES) throw createError({ statusCode: 413, statusMessage: 'Request too big' })

  const parsed = syncRequestSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid request' })

  return applySync(createPrismaSyncStore(usePrisma()), session.user.id, parsed.data)
})

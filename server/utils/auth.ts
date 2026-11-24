import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { usePrisma } from './prisma'

/**
 * Accounts: Google sign-in only. Secrets come from environment variables (never from the code):
 * BETTER_AUTH_SECRET, BETTER_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
 * Without the Google keys the app still runs: nobody can sign in, and everything else works.
 */
let instance: ReturnType<typeof createAuth> | undefined

function createAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  return betterAuth({
    database: prismaAdapter(usePrisma(), { provider: 'postgresql' }),
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    socialProviders: clientId && clientSecret ? { google: { clientId, clientSecret } } : {},
    // The person can delete their account (GDPR): their tables in the cloud go with it.
    user: { deleteUser: { enabled: true } },
  })
}

export function useAuth() {
  instance ??= createAuth()
  return instance
}

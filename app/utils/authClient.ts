import { createAuthClient } from 'better-auth/vue'

/** Browser side of Better Auth. It talks to /api/auth/* on the same site. Use it only on the client. */
export const authClient = createAuthClient()

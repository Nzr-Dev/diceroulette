import { useAuth } from '../../utils/auth'

// Every /api/auth/* request (sign in, callback, session, sign out...) is handled by Better Auth.
export default defineEventHandler((event) => useAuth().handler(toWebRequest(event)))

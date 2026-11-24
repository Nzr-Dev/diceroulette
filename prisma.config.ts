import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// The Prisma command line (migrate, generate) uses the DIRECT Neon address (without «-pooler»).
// The app itself uses the pooled one (DATABASE_URL) through the driver adapter in server/utils/prisma.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL_UNPOOLED'),
  },
})

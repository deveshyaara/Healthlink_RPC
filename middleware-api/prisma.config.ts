import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  db: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
  client: {
    adapter: '@prisma/adapter-pg',
  },
  migrations: {
    path: 'prisma/migrations',
  },
})

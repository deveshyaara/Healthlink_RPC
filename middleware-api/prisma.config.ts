import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  db: {
    url: process.env.DATABASE_URL,
  },
  datasource: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL,
  },
})

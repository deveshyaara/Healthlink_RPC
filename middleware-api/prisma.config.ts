import { defineConfig } from 'prisma/config'
import dotenv from 'dotenv'

// Load .env file
dotenv.config()

const databaseUrl = process.env.DATABASE_URL || ''

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
})

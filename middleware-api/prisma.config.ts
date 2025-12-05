// HealthLink Pro v2.0 - Prisma Configuration (Prisma 7)
// Purpose: Database connection configuration for migrations and client
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // Direct URL for migrations (bypasses connection pooler)
    directUrl: env("DIRECT_URL"),
  },
});

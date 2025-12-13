// HealthLink Pro v2.0 - Prisma Configuration
// Purpose: Database connection configuration for migrations and client
// Note: This file is for reference. Actual configuration is in prisma/schema.prisma
// The datasource block in schema.prisma handles DATABASE_URL and DIRECT_URL

import "dotenv/config";

// Configuration is now handled in prisma/schema.prisma datasource block
// DATABASE_URL - For connection pooling (PgBouncer)
// DIRECT_URL - Direct connection for migrations (bypasses pooler)

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
};

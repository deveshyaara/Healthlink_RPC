#!/bin/bash

# ============================================================================
# Prisma Database Migration Script
# Purpose: Apply schema changes to Supabase PostgreSQL database
# Usage: ./migrate.sh [dev|deploy|reset]
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}HealthLink Pro - Prisma Migration${NC}"
echo -e "${GREEN}========================================${NC}"

# Load environment variables from .env file
if [ -f .env ]; then
    echo -e "${YELLOW}Loading environment from .env file...${NC}"
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${YELLOW}Warning: .env file not found${NC}"
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not set${NC}"
    echo -e "${YELLOW}Please set DATABASE_URL in .env file${NC}"
    echo -e "${YELLOW}Format: postgresql://user:password@host:port/database${NC}"
    exit 1
fi

# Determine migration mode
MODE="${1:-dev}"

case "$MODE" in
    dev)
        echo -e "${YELLOW}Running development migration (creates migration files)...${NC}"
        npx prisma migrate dev --name auto_migration
        ;;
    
    deploy)
        echo -e "${YELLOW}Deploying migrations to production...${NC}"
        npx prisma migrate deploy
        ;;
    
    push)
        echo -e "${YELLOW}Pushing schema changes (no migration files)...${NC}"
        npx prisma db push
        ;;
    
    generate)
        echo -e "${YELLOW}Generating Prisma Client...${NC}"
        npx prisma generate
        ;;
    
    reset)
        echo -e "${RED}⚠️  DESTRUCTIVE: Resetting database (all data will be lost)${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            npx prisma migrate reset --force
        else
            echo -e "${YELLOW}Reset cancelled${NC}"
            exit 0
        fi
        ;;
    
    studio)
        echo -e "${YELLOW}Opening Prisma Studio (database GUI)...${NC}"
        npx prisma studio
        ;;
    
    *)
        echo -e "${RED}❌ Unknown mode: $MODE${NC}"
        echo -e "${YELLOW}Usage: ./migrate.sh [dev|deploy|push|generate|reset|studio]${NC}"
        echo ""
        echo "Modes:"
        echo "  dev      - Create and apply migrations (development)"
        echo "  deploy   - Apply existing migrations (production)"
        echo "  push     - Push schema changes without migration files"
        echo "  generate - Generate Prisma Client only"
        echo "  reset    - Reset database (DESTRUCTIVE)"
        echo "  studio   - Open Prisma Studio (database GUI)"
        exit 1
        ;;
esac

# Generate Prisma Client after migration
if [ "$MODE" != "generate" ] && [ "$MODE" != "studio" ]; then
    echo -e "${YELLOW}Generating Prisma Client...${NC}"
    npx prisma generate
fi

echo -e "${GREEN}✅ Migration completed successfully!${NC}"
echo -e "${YELLOW}Prisma Client is ready to use${NC}"

# Show database info
echo ""
echo -e "${GREEN}Database Information:${NC}"
npx prisma db execute --stdin <<EOF
SELECT 
  schemaname as schema,
  tablename as table,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 5;
EOF

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  1. Restart middleware: ${YELLOW}npm start${NC}"
echo -e "  2. Test API: ${YELLOW}curl http://localhost:4000/health${NC}"
echo -e "  3. View database: ${YELLOW}./migrate.sh studio${NC}"

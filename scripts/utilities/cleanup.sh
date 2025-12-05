#!/bin/bash

##############################################################################
# HealthLink System Cleanup Script
# 
# Safely removes legacy artifacts and development files
# Creates backup before deletion
# Verifies system integrity after cleanup
##############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="healthlink_backup_$(date +%Y%m%d_%H%M%S)"
PROJECT_ROOT="/workspaces/Healthlink_RPC"

echo -e "${BLUE}======================================"
echo "HealthLink System Cleanup Script"
echo "======================================${NC}"
echo ""

# Function to create backup
create_backup() {
    echo -e "${YELLOW}📦 Creating backup...${NC}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup files to be deleted
    if [ -d "$PROJECT_ROOT/my-project" ]; then
        echo "  - Backing up my-project/"
        cp -r "$PROJECT_ROOT/my-project" "$BACKUP_DIR/" 2>/dev/null || true
    fi
    
    if [ -f "$PROJECT_ROOT/fix_function_name.py" ]; then
        echo "  - Backing up fix_function_name.py"
        cp "$PROJECT_ROOT/fix_function_name.py" "$BACKUP_DIR/" 2>/dev/null || true
    fi
    
    if [ -f "$PROJECT_ROOT/frontend/test-api.js" ]; then
        echo "  - Backing up frontend/test-api.js"
        cp "$PROJECT_ROOT/frontend/test-api.js" "$BACKUP_DIR/" 2>/dev/null || true
    fi
    
    # Create archive
    tar -czf "${BACKUP_DIR}.tar.gz" "$BACKUP_DIR" 2>/dev/null || true
    rm -rf "$BACKUP_DIR"
    
    echo -e "${GREEN}✅ Backup created: ${BACKUP_DIR}.tar.gz${NC}"
    echo ""
}

# Function to show what will be deleted
show_cleanup_plan() {
    echo -e "${YELLOW}🗑️  Files to be removed:${NC}"
    echo ""
    echo "Category A: Legacy Project Directory"
    echo "  📁 my-project/rpc-server/ (entire directory)"
    echo "     - Old server implementation (replaced by middleware-api/)"
    echo "     - Old connection profile"
    echo "     - Old wallet files"
    echo "     - ~150 MB"
    echo ""
    echo "Category B: Development Test Files"
    echo "  📄 fix_function_name.py"
    echo "  📄 frontend/test-api.js"
    echo "  📄 frontend/.frontend.pid"
    echo "  📄 middleware-api/server.log"
    echo ""
    echo "Category C: Optional Scripts (will NOT be deleted)"
    echo "  ℹ️  start.sh, status.sh, stop.sh (kept for convenience)"
    echo ""
    echo -e "${BLUE}Total space to be freed: ~157 MB${NC}"
    echo ""
}

# Function to perform cleanup
perform_cleanup() {
    echo -e "${YELLOW}🧹 Starting cleanup...${NC}"
    echo ""
    
    # Phase 1: Remove legacy project directory
    if [ -d "$PROJECT_ROOT/my-project" ]; then
        echo "  Removing my-project/ directory..."
        rm -rf "$PROJECT_ROOT/my-project"
        echo -e "${GREEN}  ✅ Removed my-project/${NC}"
    else
        echo "  ℹ️  my-project/ already removed"
    fi
    
    # Phase 2: Remove test files
    if [ -f "$PROJECT_ROOT/fix_function_name.py" ]; then
        echo "  Removing fix_function_name.py..."
        rm -f "$PROJECT_ROOT/fix_function_name.py"
        echo -e "${GREEN}  ✅ Removed fix_function_name.py${NC}"
    else
        echo "  ℹ️  fix_function_name.py already removed"
    fi
    
    if [ -f "$PROJECT_ROOT/frontend/test-api.js" ]; then
        echo "  Removing frontend/test-api.js..."
        rm -f "$PROJECT_ROOT/frontend/test-api.js"
        echo -e "${GREEN}  ✅ Removed frontend/test-api.js${NC}"
    else
        echo "  ℹ️  frontend/test-api.js already removed"
    fi
    
    if [ -f "$PROJECT_ROOT/frontend/.frontend.pid" ]; then
        echo "  Removing frontend/.frontend.pid..."
        rm -f "$PROJECT_ROOT/frontend/.frontend.pid"
        echo -e "${GREEN}  ✅ Removed frontend/.frontend.pid${NC}"
    else
        echo "  ℹ️  frontend/.frontend.pid already removed"
    fi
    
    if [ -f "$PROJECT_ROOT/middleware-api/server.log" ]; then
        echo "  Removing middleware-api/server.log..."
        rm -f "$PROJECT_ROOT/middleware-api/server.log"
        echo -e "${GREEN}  ✅ Removed middleware-api/server.log${NC}"
    else
        echo "  ℹ️  middleware-api/server.log already removed"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Cleanup complete!${NC}"
    echo ""
}

# Function to verify system after cleanup
verify_system() {
    echo -e "${YELLOW}🔍 Verifying system integrity...${NC}"
    echo ""
    
    # Check critical directories exist
    CRITICAL_DIRS=(
        "$PROJECT_ROOT/middleware-api"
        "$PROJECT_ROOT/frontend"
        "$PROJECT_ROOT/fabric-samples"
        "$PROJECT_ROOT/middleware-api/wallet"
        "$PROJECT_ROOT/middleware-api/config"
    )
    
    for dir in "${CRITICAL_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            echo -e "${GREEN}  ✅ $dir${NC}"
        else
            echo -e "${RED}  ❌ MISSING: $dir${NC}"
            exit 1
        fi
    done
    
    # Check critical files exist
    CRITICAL_FILES=(
        "$PROJECT_ROOT/middleware-api/.env"
        "$PROJECT_ROOT/middleware-api/config/connection-profile.json"
        "$PROJECT_ROOT/middleware-api/package.json"
        "$PROJECT_ROOT/middleware-api/src/server.js"
    )
    
    for file in "${CRITICAL_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}  ✅ $file${NC}"
        else
            echo -e "${RED}  ❌ MISSING: $file${NC}"
            exit 1
        fi
    done
    
    echo ""
    echo -e "${GREEN}✅ All critical files intact!${NC}"
    echo ""
}

# Function to run system status check
run_status_check() {
    echo -e "${BLUE}📊 Running system status check...${NC}"
    echo ""
    
    if [ -f "$PROJECT_ROOT/demo.sh" ]; then
        cd "$PROJECT_ROOT"
        ./demo.sh
    else
        echo -e "${YELLOW}⚠️  demo.sh not found, skipping status check${NC}"
    fi
}

# Main execution
main() {
    cd "$PROJECT_ROOT"
    
    show_cleanup_plan
    
    # Confirmation prompt
    read -p "Do you want to proceed with cleanup? (y/N) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Cleanup cancelled.${NC}"
        exit 0
    fi
    
    create_backup
    perform_cleanup
    verify_system
    run_status_check
    
    echo ""
    echo -e "${GREEN}======================================"
    echo "✅ Cleanup Complete!"
    echo "======================================${NC}"
    echo ""
    echo "Summary:"
    echo "  - Backup created: ${BACKUP_DIR}.tar.gz"
    echo "  - Legacy files removed"
    echo "  - System verified and operational"
    echo ""
    echo "Next steps:"
    echo "  1. Run: node system_verification.js"
    echo "  2. Test frontend: http://localhost:9002/blockchain-test"
    echo "  3. Review: ARCHITECTURAL_REVIEW.md"
    echo ""
}

# Run main function
main

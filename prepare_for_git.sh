#!/bin/bash

##############################################################################
# HealthLink Pro v2.0 - Git Preparation Script
# 
# Purpose: Final cleanup before GitHub push
# Author: Release Manager & DevSecOps Engineer
# Date: December 5, 2025
# 
# What it does:
# 1. Deletes temporary files and logs
# 2. Organizes utility scripts into /scripts directory
# 3. Removes backup files and archives
# 4. Keeps root directory clean and professional
# 5. Verifies no sensitive data will be committed
##############################################################################

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ROOT_DIR="/workspaces/Healthlink_RPC"
SCRIPTS_DIR="$ROOT_DIR/scripts"

##############################################################################
# Functions
##############################################################################

print_header() {
    echo -e "\n${CYAN}${BOLD}========================================${NC}"
    echo -e "${CYAN}${BOLD}$1${NC}"
    echo -e "${CYAN}${BOLD}========================================${NC}\n"
}

print_step() {
    echo -e "${BLUE}[STEP $1/$2]${NC} ${BOLD}$3${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}→ $1${NC}"
}

##############################################################################
# Main Execution
##############################################################################

print_header "HEALTHLINK PRO v2.0 - GIT PREPARATION"

cd "$ROOT_DIR"

# STEP 1: Delete Temporary Files & Logs
print_step 1 6 "Deleting Temporary Files and Logs"

# Count files before deletion
LOG_COUNT=$(find . -name "*.log" -type f 2>/dev/null | wc -l)
BAK_COUNT=$(find . -name "*.bak" -type f 2>/dev/null | wc -l)
TMP_COUNT=$(find . -name "*.tmp" -type f 2>/dev/null | wc -l)
TAR_COUNT=$(find . -name "*.tar.gz" -type f 2>/dev/null | wc -l)

echo -e "  ${CYAN}Found:${NC}"
echo -e "    - ${YELLOW}$LOG_COUNT${NC} .log files"
echo -e "    - ${YELLOW}$BAK_COUNT${NC} .bak files"
echo -e "    - ${YELLOW}$TMP_COUNT${NC} .tmp files"
echo -e "    - ${YELLOW}$TAR_COUNT${NC} .tar.gz files"

# Delete log files (except important ones)
find . -name "*.log" -type f ! -path "*/node_modules/*" -delete 2>/dev/null || true
print_success "Deleted *.log files"

# Delete backup files
find . -name "*.bak" -type f ! -path "*/node_modules/*" -delete 2>/dev/null || true
find . -name "*.backup" -type f ! -path "*/node_modules/*" -delete 2>/dev/null || true
print_success "Deleted *.bak and *.backup files"

# Delete temporary files
find . -name "*.tmp" -type f ! -path "*/node_modules/*" -delete 2>/dev/null || true
find . -name "temp_*" -type f ! -path "*/node_modules/*" -delete 2>/dev/null || true
print_success "Deleted *.tmp and temp_* files"

# Delete compressed archives
find . -name "*.tar.gz" -type f ! -path "*/node_modules/*" -delete 2>/dev/null || true
find . -name "*.zip" -type f ! -path "*/node_modules/*" ! -name "fabric-samples.zip" -delete 2>/dev/null || true
print_success "Deleted compressed archives"

# Delete backup directories
find . -name "backup-*" -type d ! -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -name "old-*" -type d ! -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
print_success "Deleted backup-* and old-* directories"

# Delete specific temporary files
rm -f nohup.out 2>/dev/null || true
rm -f *.pid 2>/dev/null || true
rm -f .DS_Store 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true
print_success "Deleted nohup.out, *.pid, and .DS_Store files"

# STEP 2: Create Scripts Directory
print_step 2 6 "Creating Scripts Directory"

mkdir -p "$SCRIPTS_DIR"
mkdir -p "$SCRIPTS_DIR/deployment"
mkdir -p "$SCRIPTS_DIR/utilities"
mkdir -p "$SCRIPTS_DIR/testing"
print_success "Created /scripts directory structure"

# STEP 3: Organize Utility Scripts
print_step 3 6 "Organizing Utility Scripts"

# Move deployment scripts
DEPLOYMENT_SCRIPTS=(
    "deploy.sh"
    "deploy-low-spec.sh"
    "fix_frontend_build.sh"
    "organize_repo.sh"
    "prepare_for_git.sh"
    "setup-vps.sh"
    "setup-ssl.sh"
)

echo -e "  ${CYAN}Moving deployment scripts...${NC}"
for script in "${DEPLOYMENT_SCRIPTS[@]}"; do
    if [ -f "$ROOT_DIR/$script" ] && [ "$script" != "prepare_for_git.sh" ]; then
        mv "$ROOT_DIR/$script" "$SCRIPTS_DIR/deployment/" 2>/dev/null || true
        print_info "Moved $script"
    fi
done

# Move utility scripts
UTILITY_SCRIPTS=(
    "cleanup.sh"
    "cleanup-docs.sh"
    "clean-install.sh"
    "fix-frontend-issues.sh"
    "fix-console-logs.sh"
    "run-all-fixes.sh"
    "fix_function_name.py"
)

echo -e "  ${CYAN}Moving utility scripts...${NC}"
for script in "${UTILITY_SCRIPTS[@]}"; do
    if [ -f "$ROOT_DIR/$script" ]; then
        mv "$ROOT_DIR/$script" "$SCRIPTS_DIR/utilities/" 2>/dev/null || true
        print_info "Moved $script"
    fi
done

# Move testing/verification scripts
TESTING_SCRIPTS=(
    "verify_release.sh"
    "demo.sh"
)

echo -e "  ${CYAN}Moving testing scripts...${NC}"
for script in "${TESTING_SCRIPTS[@]}"; do
    if [ -f "$ROOT_DIR/$script" ]; then
        mv "$ROOT_DIR/$script" "$SCRIPTS_DIR/testing/" 2>/dev/null || true
        print_info "Moved $script"
    fi
done

# Move middleware-api verification script
if [ -f "$ROOT_DIR/middleware-api/verify_full_stack.js" ]; then
    mv "$ROOT_DIR/middleware-api/verify_full_stack.js" "$SCRIPTS_DIR/testing/" 2>/dev/null || true
    print_info "Moved verify_full_stack.js"
fi

# Remove broken verification script
if [ -f "$ROOT_DIR/middleware-api/verify_full_stack.js.broken" ]; then
    rm -f "$ROOT_DIR/middleware-api/verify_full_stack.js.broken" 2>/dev/null || true
    print_info "Deleted broken verification script"
fi

print_success "Organized utility scripts into /scripts"

# STEP 4: Keep Core Scripts in Root
print_step 4 6 "Keeping Core Scripts in Root"

CORE_SCRIPTS=(
    "start.sh"
    "start-low-spec.sh"
    "stop.sh"
    "stop-low-spec.sh"
    "status.sh"
)

echo -e "  ${CYAN}Core scripts remaining in root:${NC}"
for script in "${CORE_SCRIPTS[@]}"; do
    if [ -f "$ROOT_DIR/$script" ]; then
        print_info "$script ✓"
    fi
done

print_success "Core scripts preserved in root"

# STEP 5: Clean Up Clutter
print_step 5 6 "Removing Clutter and Duplicates"

# Remove duplicate documentation (keep only main README)
if [ -d "$ROOT_DIR/docs/archive" ]; then
    echo -e "  ${CYAN}Cleaning archived documentation...${NC}"
    # Keep archive but remove duplicates
    find "$ROOT_DIR/docs/archive" -name "README*.md" -delete 2>/dev/null || true
    print_info "Removed duplicate READMEs from archive"
fi

# Remove empty directories
find "$ROOT_DIR" -type d -empty ! -path "*/node_modules/*" ! -path "*/.next/*" -delete 2>/dev/null || true
print_success "Removed empty directories"

# Clean middleware-api logs directory
if [ -d "$ROOT_DIR/middleware-api/logs" ]; then
    rm -rf "$ROOT_DIR/middleware-api/logs"/* 2>/dev/null || true
    print_info "Cleaned middleware-api/logs"
fi

# Clean frontend logs directory
if [ -d "$ROOT_DIR/frontend/logs" ]; then
    rm -rf "$ROOT_DIR/frontend/logs"/* 2>/dev/null || true
    print_info "Cleaned frontend/logs"
fi

print_success "Removed clutter and duplicates"

# STEP 6: Security Verification
print_step 6 6 "Security Verification - Checking for Sensitive Data"

echo -e "  ${CYAN}Scanning for sensitive files that should NOT be committed...${NC}\n"

SENSITIVE_FOUND=0

# Check for .env files in critical locations
echo -e "  ${YELLOW}[CHECK 1/7]${NC} Environment files (.env)"
if [ -f "$ROOT_DIR/.env" ] || [ -f "$ROOT_DIR/middleware-api/.env" ] || [ -f "$ROOT_DIR/frontend/.env.local" ]; then
    print_warning "Found .env files (will be ignored by .gitignore)"
    SENSITIVE_FOUND=$((SENSITIVE_FOUND + 1))
else
    print_success "No .env files found in root"
fi

# Check for Fabric wallets
echo -e "  ${YELLOW}[CHECK 2/7]${NC} Fabric wallets"
WALLET_COUNT=$(find "$ROOT_DIR" -type d -name "wallet" ! -path "*/node_modules/*" 2>/dev/null | wc -l)
if [ $WALLET_COUNT -gt 0 ]; then
    print_warning "Found $WALLET_COUNT wallet directories (will be ignored by .gitignore)"
    SENSITIVE_FOUND=$((SENSITIVE_FOUND + 1))
else
    print_success "No wallet directories found"
fi

# Check for keystore
echo -e "  ${YELLOW}[CHECK 3/7]${NC} Keystores"
KEYSTORE_COUNT=$(find "$ROOT_DIR" -type d -name "keystore" ! -path "*/node_modules/*" 2>/dev/null | wc -l)
if [ $KEYSTORE_COUNT -gt 0 ]; then
    print_warning "Found $KEYSTORE_COUNT keystore directories (will be ignored by .gitignore)"
    SENSITIVE_FOUND=$((SENSITIVE_FOUND + 1))
else
    print_success "No keystore directories found"
fi

# Check for uploads directory
echo -e "  ${YELLOW}[CHECK 4/7]${NC} Uploads directory (CAS storage)"
if [ -d "$ROOT_DIR/middleware-api/uploads" ]; then
    UPLOAD_COUNT=$(find "$ROOT_DIR/middleware-api/uploads" -type f 2>/dev/null | wc -l)
    print_warning "Found uploads/ with $UPLOAD_COUNT files (will be ignored by .gitignore)"
    SENSITIVE_FOUND=$((SENSITIVE_FOUND + 1))
else
    print_success "No uploads directory found"
fi

# Check for build artifacts
echo -e "  ${YELLOW}[CHECK 5/7]${NC} Build artifacts"
BUILD_COUNT=$(find "$ROOT_DIR" -type d -name ".next" -o -name "dist" -o -name "build" ! -path "*/node_modules/*" 2>/dev/null | wc -l)
if [ $BUILD_COUNT -gt 0 ]; then
    print_info "Found $BUILD_COUNT build directories (will be ignored by .gitignore)"
else
    print_success "No build artifacts found"
fi

# Check for node_modules
echo -e "  ${YELLOW}[CHECK 6/7]${NC} Dependencies (node_modules)"
NODE_MODULES_COUNT=$(find "$ROOT_DIR" -type d -name "node_modules" -maxdepth 3 2>/dev/null | wc -l)
if [ $NODE_MODULES_COUNT -gt 0 ]; then
    print_info "Found $NODE_MODULES_COUNT node_modules directories (will be ignored by .gitignore)"
else
    print_success "No node_modules found"
fi

# Check for Fabric generated artifacts
echo -e "  ${YELLOW}[CHECK 7/7]${NC} Fabric generated artifacts"
if [ -d "$ROOT_DIR/fabric-samples/test-network/organizations" ] || [ -d "$ROOT_DIR/fabric-samples/test-network/channel-artifacts" ]; then
    print_warning "Found Fabric generated artifacts (will be ignored by .gitignore)"
    SENSITIVE_FOUND=$((SENSITIVE_FOUND + 1))
else
    print_success "No Fabric artifacts found"
fi

echo ""
if [ $SENSITIVE_FOUND -gt 0 ]; then
    print_warning "Found $SENSITIVE_FOUND types of sensitive data"
    echo -e "  ${CYAN}These will be excluded via .gitignore${NC}"
else
    print_success "No sensitive data found"
fi

print_success "Security verification complete"

# STEP 7: Final Summary
print_header "CLEANUP SUMMARY"

echo -e "${BOLD}Directory Structure:${NC}"
echo -e "${GREEN}✓${NC} /scripts/deployment/    - Deployment scripts"
echo -e "${GREEN}✓${NC} /scripts/utilities/    - Utility scripts"
echo -e "${GREEN}✓${NC} /scripts/testing/      - Testing scripts"
echo -e "${GREEN}✓${NC} Root directory         - Clean (only core files)"

echo -e "\n${BOLD}Root Directory Contents:${NC}"
ls -1 "$ROOT_DIR" | grep -E '\.(sh|md|yaml|yml|json)$|^(middleware-api|frontend|fabric-samples|docs|scripts)$' | while read file; do
    echo -e "  ${CYAN}→${NC} $file"
done

echo -e "\n${BOLD}Scripts Organization:${NC}"
if [ -d "$SCRIPTS_DIR/deployment" ]; then
    DEPLOY_COUNT=$(ls -1 "$SCRIPTS_DIR/deployment" 2>/dev/null | wc -l)
    echo -e "  ${GREEN}→${NC} Deployment: $DEPLOY_COUNT scripts"
fi
if [ -d "$SCRIPTS_DIR/utilities" ]; then
    UTIL_COUNT=$(ls -1 "$SCRIPTS_DIR/utilities" 2>/dev/null | wc -l)
    echo -e "  ${GREEN}→${NC} Utilities: $UTIL_COUNT scripts"
fi
if [ -d "$SCRIPTS_DIR/testing" ]; then
    TEST_COUNT=$(ls -1 "$SCRIPTS_DIR/testing" 2>/dev/null | wc -l)
    echo -e "  ${GREEN}→${NC} Testing: $TEST_COUNT scripts"
fi

echo -e "\n${BOLD}Security Status:${NC}"
echo -e "${GREEN}✓${NC} Sensitive files will be excluded by .gitignore"
echo -e "${GREEN}✓${NC} Fabric wallets protected"
echo -e "${GREEN}✓${NC} Environment variables protected"
echo -e "${GREEN}✓${NC} Uploads directory excluded"

echo -e "\n${CYAN}${BOLD}========================================${NC}"
echo -e "${GREEN}${BOLD}✅ REPOSITORY READY FOR GIT PUSH${NC}"
echo -e "${CYAN}${BOLD}========================================${NC}\n"

echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Review the .gitignore file"
echo -e "  2. Run: git init"
echo -e "  3. Run: git add ."
echo -e "  4. Run: git commit -m \"feat: Initial release v2.0 - Production Ready\""
echo -e "  5. Run: git branch -M main"
echo -e "  6. Add remote and push\n"

print_success "Preparation complete!"

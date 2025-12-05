#!/bin/bash

##############################################################################
# Security Verification Script
# Checks for sensitive files before Git push
##############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}SECURITY VERIFICATION - Sensitive Files${NC}"
echo -e "${CYAN}========================================${NC}\n"

ISSUES_FOUND=0

# Check 1: .env files
echo -e "${YELLOW}[1/6]${NC} Checking for .env files..."
ENV_FILES=$(find . -name ".env" -o -name ".env.*" ! -name ".env.example" ! -path "*/node_modules/*" 2>/dev/null)
if [ -z "$ENV_FILES" ]; then
    echo -e "${GREEN}✓ No .env files found${NC}"
else
    echo -e "${RED}✗ Found .env files:${NC}"
    echo "$ENV_FILES"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check 2: Fabric wallets
echo -e "\n${YELLOW}[2/6]${NC} Checking for Fabric wallets..."
WALLETS=$(find . -type d -name "wallet" ! -path "*/node_modules/*" 2>/dev/null)
if [ -z "$WALLETS" ]; then
    echo -e "${GREEN}✓ No wallet directories found${NC}"
else
    echo -e "${RED}✗ Found wallet directories:${NC}"
    echo "$WALLETS"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check 3: Keystores
echo -e "\n${YELLOW}[3/6]${NC} Checking for keystores..."
KEYSTORES=$(find . -type d -name "keystore" ! -path "*/node_modules/*" 2>/dev/null)
if [ -z "$KEYSTORES" ]; then
    echo -e "${GREEN}✓ No keystore directories found${NC}"
else
    echo -e "${RED}✗ Found keystore directories:${NC}"
    echo "$KEYSTORES"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check 4: Uploads directory
echo -e "\n${YELLOW}[4/6]${NC} Checking for uploads directories..."
UPLOADS=$(find . -type d -name "uploads" ! -path "*/node_modules/*" 2>/dev/null | head -5)
if [ -z "$UPLOADS" ]; then
    echo -e "${GREEN}✓ No uploads directories found${NC}"
else
    echo -e "${YELLOW}⚠ Found uploads directories (will be ignored by .gitignore):${NC}"
    echo "$UPLOADS"
fi

# Check 5: Fabric generated artifacts
echo -e "\n${YELLOW}[5/6]${NC} Checking for Fabric artifacts..."
if [ -d "fabric-samples/test-network/organizations" ]; then
    echo -e "${YELLOW}⚠ Found Fabric organizations/ (will be ignored by .gitignore)${NC}"
else
    echo -e "${GREEN}✓ No Fabric organizations/ found${NC}"
fi

# Check 6: .gitignore existence
echo -e "\n${YELLOW}[6/6]${NC} Checking .gitignore..."
if [ -f ".gitignore" ]; then
    echo -e "${GREEN}✓ .gitignore exists${NC}"
    GITIGNORE_SIZE=$(wc -l < .gitignore)
    echo -e "  ${CYAN}→ $GITIGNORE_SIZE lines${NC}"
else
    echo -e "${RED}✗ .gitignore NOT FOUND!${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Final verdict
echo -e "\n${CYAN}========================================${NC}"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ SECURITY CHECK PASSED${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo -e "\n${GREEN}Safe to push to GitHub!${NC}\n"
    exit 0
else
    echo -e "${RED}❌ SECURITY CHECK FAILED${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo -e "\n${RED}Found $ISSUES_FOUND critical issues!${NC}"
    echo -e "${YELLOW}DO NOT push to GitHub until resolved.${NC}\n"
    exit 1
fi

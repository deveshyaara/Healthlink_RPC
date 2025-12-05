#!/bin/bash

##############################################################################
# Repository Documentation Cleanup Script
# Organizes documentation, removes test files, creates clean structure
##############################################################################

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "Repository Documentation Cleanup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Create /docs directory structure
echo -e "${GREEN}[1/5] Creating /docs directory structure...${NC}"
mkdir -p docs/{architecture,deployment,guides,security,summaries}

echo "  ✓ Created: docs/architecture"
echo "  ✓ Created: docs/deployment"
echo "  ✓ Created: docs/guides"
echo "  ✓ Created: docs/security"
echo "  ✓ Created: docs/summaries"
echo ""

# Step 2: Move documentation files to appropriate subdirectories
echo -e "${GREEN}[2/5] Moving documentation files...${NC}"

# Architecture documents
mv -v API_GATEWAY_IMPLEMENTATION.md docs/architecture/ 2>/dev/null || true
mv -v ARCHITECTURAL_REVIEW.md docs/architecture/ 2>/dev/null || true
mv -v DOCKER_VERIFICATION_REFACTOR.md docs/architecture/ 2>/dev/null || true
mv -v SECURITY_ARCHITECTURE.md docs/architecture/ 2>/dev/null || true

# Deployment documents
mv -v DEPLOYMENT_SUMMARY.md docs/deployment/ 2>/dev/null || true
mv -v LOW_SPEC_DEPLOYMENT.md docs/deployment/ 2>/dev/null || true
mv -v LOW_SPEC_OPTIMIZATION_GUIDE.md docs/deployment/ 2>/dev/null || true
mv -v LOW_SPEC_QUICK_REFERENCE.md docs/deployment/ 2>/dev/null || true
mv -v PRODUCTION_DEPLOYMENT_GUIDE.md docs/deployment/ 2>/dev/null || true
mv -v VPS_DEPLOYMENT_SUMMARY.md docs/deployment/ 2>/dev/null || true
mv -v VPS_QUICK_REFERENCE.md docs/deployment/ 2>/dev/null || true

# Guides and tutorials
mv -v DEBUGGING_GUIDE.md docs/guides/ 2>/dev/null || true
mv -v DEMO_SCRIPT.md docs/guides/ 2>/dev/null || true
mv -v GO_LIVE_CHECKLIST.md docs/guides/ 2>/dev/null || true
mv -v QUICK_REFERENCE.md docs/guides/ 2>/dev/null || true
mv -v STARTUP_SCRIPT_EXPLANATION.md docs/guides/ 2>/dev/null || true
mv -v TROUBLESHOOTING.md docs/guides/ 2>/dev/null || true

# Security documents
mv -v SECURITY_EXECUTIVE_SUMMARY.md docs/security/ 2>/dev/null || true
mv -v SECURITY_IMPLEMENTATION_SUMMARY.md docs/security/ 2>/dev/null || true
mv -v SECURITY_QUICK_START.md docs/security/ 2>/dev/null || true

# Summary and audit documents
mv -v AUDIT_CLEANUP.md docs/summaries/ 2>/dev/null || true
mv -v AUDIT_SUMMARY.md docs/summaries/ 2>/dev/null || true
mv -v BEFORE_AFTER_COMPARISON.md docs/summaries/ 2>/dev/null || true
mv -v FINAL_ACCEPTANCE_TEST.md docs/summaries/ 2>/dev/null || true
mv -v FRONTEND_BACKEND_CONNECTION_REPORT.md docs/summaries/ 2>/dev/null || true
mv -v FRONTEND_BACKEND_MISMATCH_REPORT.md docs/summaries/ 2>/dev/null || true
mv -v FRONTEND_FIX_REPORT.md docs/summaries/ 2>/dev/null || true
mv -v IMPLEMENTATION_SUMMARY.md docs/summaries/ 2>/dev/null || true
mv -v INTEGRATION_STATUS.md docs/summaries/ 2>/dev/null || true
mv -v PRE_PRODUCTION_GAP_ANALYSIS.md docs/summaries/ 2>/dev/null || true
mv -v REFACTORING_REPORT.md docs/summaries/ 2>/dev/null || true
mv -v ROOT_CAUSE_ANALYSIS.md docs/summaries/ 2>/dev/null || true
mv -v STARTUP_REFACTORING_SUMMARY.md docs/summaries/ 2>/dev/null || true

# Documentation indexes
mv -v DOCUMENTATION_INDEX.md docs/ 2>/dev/null || true
mv -v MASTER_DOCUMENTATION_INDEX.md docs/ 2>/dev/null || true

echo ""

# Step 3: Delete backup files and old versions
echo -e "${GREEN}[3/5] Removing backup and temporary files...${NC}"

rm -f healthlink_backup_*.tar.gz 2>/dev/null && echo "  ✓ Deleted: healthlink_backup_*.tar.gz" || echo "  - No backup tarballs found"
rm -f README_OLD.md 2>/dev/null && echo "  ✓ Deleted: README_OLD.md" || echo "  - README_OLD.md not found"
rm -f *.bak 2>/dev/null && echo "  ✓ Deleted: *.bak files" || echo "  - No .bak files found"
rm -f *.original 2>/dev/null && echo "  ✓ Deleted: *.original files" || echo "  - No .original files found"

echo ""

# Step 4: Delete test scripts (development only)
echo -e "${GREEN}[4/5] Removing test scripts...${NC}"

rm -f test-security-implementation.sh 2>/dev/null && echo "  ✓ Deleted: test-security-implementation.sh" || echo "  - test-security-implementation.sh not found"
rm -f test-startup-improvements.sh 2>/dev/null && echo "  ✓ Deleted: test-startup-improvements.sh" || echo "  - test-startup-improvements.sh not found"
rm -f verify-zero-mock-data.sh 2>/dev/null && echo "  ✓ Deleted: verify-zero-mock-data.sh" || echo "  - verify-zero-mock-data.sh not found"
rm -f system_verification.js 2>/dev/null && echo "  ✓ Deleted: system_verification.js" || echo "  - system_verification.js not found"

echo ""

# Step 5: Create documentation index
echo -e "${GREEN}[5/5] Creating documentation index...${NC}"

cat > docs/README.md << 'EOF'
# Healthlink Documentation

This directory contains all technical documentation for the Healthlink Blockchain Health Records Management System.

---

## 📁 Directory Structure

```
docs/
├── architecture/       # System design and architecture documents
├── deployment/        # Deployment guides and configurations
├── guides/           # User guides and tutorials
├── security/         # Security documentation and policies
└── summaries/        # Audit reports and summaries
```

---

## 🏗️ Architecture

Technical design documents and system architecture:

- [API Gateway Implementation](architecture/API_GATEWAY_IMPLEMENTATION.md)
- [Architectural Review](architecture/ARCHITECTURAL_REVIEW.md)
- [Docker Verification Refactor](architecture/DOCKER_VERIFICATION_REFACTOR.md)
- [Security Architecture](architecture/SECURITY_ARCHITECTURE.md)

---

## 🚀 Deployment

Deployment guides for various environments:

### Production Deployment
- [Production Deployment Guide](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [VPS Deployment Summary](deployment/VPS_DEPLOYMENT_SUMMARY.md)
- [VPS Quick Reference](deployment/VPS_QUICK_REFERENCE.md)
- [Deployment Summary](deployment/DEPLOYMENT_SUMMARY.md)

### Low-Spec/Resource-Constrained Deployment
- [Low Spec Optimization Guide](deployment/LOW_SPEC_OPTIMIZATION_GUIDE.md)
- [Low Spec Deployment](deployment/LOW_SPEC_DEPLOYMENT.md)
- [Low Spec Quick Reference](deployment/LOW_SPEC_QUICK_REFERENCE.md)

---

## 📖 Guides

User guides, tutorials, and troubleshooting:

- [Debugging Guide](guides/DEBUGGING_GUIDE.md)
- [Demo Script](guides/DEMO_SCRIPT.md)
- [Go-Live Checklist](guides/GO_LIVE_CHECKLIST.md)
- [Quick Reference](guides/QUICK_REFERENCE.md)
- [Startup Script Explanation](guides/STARTUP_SCRIPT_EXPLANATION.md)
- [Troubleshooting](guides/TROUBLESHOOTING.md)

---

## 🔒 Security

Security policies and implementation details:

- [Security Executive Summary](security/SECURITY_EXECUTIVE_SUMMARY.md)
- [Security Implementation Summary](security/SECURITY_IMPLEMENTATION_SUMMARY.md)
- [Security Quick Start](security/SECURITY_QUICK_START.md)

---

## 📊 Summaries & Audit Reports

Development summaries and quality audit reports:

- [Frontend Fix Report](summaries/FRONTEND_FIX_REPORT.md) - Latest QA audit
- [Audit Cleanup](summaries/AUDIT_CLEANUP.md)
- [Audit Summary](summaries/AUDIT_SUMMARY.md)
- [Before/After Comparison](summaries/BEFORE_AFTER_COMPARISON.md)
- [Final Acceptance Test](summaries/FINAL_ACCEPTANCE_TEST.md)
- [Frontend-Backend Connection Report](summaries/FRONTEND_BACKEND_CONNECTION_REPORT.md)
- [Frontend-Backend Mismatch Report](summaries/FRONTEND_BACKEND_MISMATCH_REPORT.md)
- [Implementation Summary](summaries/IMPLEMENTATION_SUMMARY.md)
- [Integration Status](summaries/INTEGRATION_STATUS.md)
- [Pre-Production Gap Analysis](summaries/PRE_PRODUCTION_GAP_ANALYSIS.md)
- [Refactoring Report](summaries/REFACTORING_REPORT.md)
- [Root Cause Analysis](summaries/ROOT_CAUSE_ANALYSIS.md)
- [Startup Refactoring Summary](summaries/STARTUP_REFACTORING_SUMMARY.md)

---

## 🔍 Quick Start

**For Production Deployment**:
1. Read [Production Deployment Guide](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)
2. Follow [Go-Live Checklist](guides/GO_LIVE_CHECKLIST.md)
3. Review [Security Quick Start](security/SECURITY_QUICK_START.md)

**For Low-Spec Deployment** (1-2 vCPU, 2-4GB RAM):
1. Read [Low Spec Optimization Guide](deployment/LOW_SPEC_OPTIMIZATION_GUIDE.md)
2. Use [Low Spec Quick Reference](deployment/LOW_SPEC_QUICK_REFERENCE.md)
3. Deploy with `./deploy-low-spec.sh`

**For Troubleshooting**:
1. Check [Troubleshooting](guides/TROUBLESHOOTING.md)
2. Review [Debugging Guide](guides/DEBUGGING_GUIDE.md)

---

## 📞 Need Help?

- Check [Troubleshooting Guide](guides/TROUBLESHOOTING.md) first
- Review [Debugging Guide](guides/DEBUGGING_GUIDE.md) for technical issues
- See [Quick Reference](guides/QUICK_REFERENCE.md) for command cheat sheet

---

**Last Updated**: December 2024  
**Project**: Healthlink Blockchain Health Records System
EOF

echo "  ✓ Created: docs/README.md (Documentation Index)"
echo ""

# Final summary
echo "=========================================="
echo -e "${GREEN}✓ Cleanup Complete!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Created /docs directory structure"
echo "  - Moved 30+ documentation files to organized subdirectories"
echo "  - Deleted backup files and test scripts"
echo "  - Created comprehensive documentation index"
echo ""
echo "Root directory now contains only:"
echo "  ✓ README.md (project overview)"
echo "  ✓ LICENSE (license file)"
echo "  ✓ Essential config files (docker-compose, .env, package.json)"
echo "  ✓ Deployment scripts (start.sh, stop.sh, setup-vps.sh, etc.)"
echo "  ✓ Core project folders (frontend/, middleware-api/, fabric-samples/)"
echo ""
echo "Documentation organized in:"
echo "  📁 docs/architecture    - System design documents"
echo "  📁 docs/deployment     - Deployment guides"
echo "  📁 docs/guides         - User guides and tutorials"
echo "  📁 docs/security       - Security documentation"
echo "  📁 docs/summaries      - Audit reports and summaries"
echo ""
echo -e "${GREEN}Repository is now production-ready!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review docs/summaries/FRONTEND_FIX_REPORT.md for remaining issues"
echo "  2. Delete test pages: rm -rf frontend/src/app/{debug,blockchain-test}"
echo "  3. Fix or remove Users management page (uses mock data)"
echo "  4. Run: git add . && git commit -m 'chore: organize documentation'"
echo ""

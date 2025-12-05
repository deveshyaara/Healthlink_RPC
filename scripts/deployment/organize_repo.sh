#!/bin/bash

################################################################################
# organize_repo.sh - Repository Hygiene Script ("The Janitor")
# Purpose: Archive temporary documentation and clean up clutter
# Author: DevOps & QA Lead
# Date: December 5, 2025
################################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║        🧹 HealthLink Pro - Repository Organizer 🧹       ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Get the project root directory
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT"

# Create archive directory
ARCHIVE_DIR="docs/archive"
echo -e "${BLUE}[1/5]${NC} Creating archive directory..."
mkdir -p "$ARCHIVE_DIR"
echo -e "${GREEN}✓${NC} Created: $ARCHIVE_DIR"
echo ""

# List of files to KEEP in root (whitelist)
KEEP_FILES=(
    "README.md"
    "LICENSE"
    "CHANGELOG.md"
    ".gitignore"
    ".env.example"
)

# Function to check if file should be kept
should_keep_file() {
    local filename="$1"
    for keep in "${KEEP_FILES[@]}"; do
        if [ "$filename" == "$keep" ]; then
            return 0  # Keep this file
        fi
    done
    return 1  # Move this file
}

# Archive .md files from root
echo -e "${BLUE}[2/5]${NC} Archiving documentation files..."
MD_COUNT=0
for file in *.md; do
    # Check if any .md files exist
    if [ ! -e "$file" ]; then
        echo -e "${YELLOW}⚠${NC}  No .md files found in root"
        break
    fi
    
    # Check if file should be kept
    if should_keep_file "$file"; then
        echo -e "${GREEN}✓${NC} Keeping: $file"
    else
        mv "$file" "$ARCHIVE_DIR/"
        echo -e "${BLUE}→${NC} Archived: $file → $ARCHIVE_DIR/"
        ((MD_COUNT++))
    fi
done
echo -e "${GREEN}✓${NC} Archived $MD_COUNT documentation files"
echo ""

# Delete log files
echo -e "${BLUE}[3/5]${NC} Removing log files..."
LOG_COUNT=0
for file in *.log; do
    if [ -e "$file" ]; then
        rm "$file"
        echo -e "${RED}✗${NC} Deleted: $file"
        ((LOG_COUNT++))
    fi
done
if [ $LOG_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No log files found"
else
    echo -e "${GREEN}✓${NC} Deleted $LOG_COUNT log files"
fi
echo ""

# Delete macOS .DS_Store files
echo -e "${BLUE}[4/5]${NC} Removing .DS_Store files..."
DS_COUNT=$(find . -name ".DS_Store" -type f | wc -l)
if [ $DS_COUNT -gt 0 ]; then
    find . -name ".DS_Store" -type f -delete
    echo -e "${GREEN}✓${NC} Deleted $DS_COUNT .DS_Store files"
else
    echo -e "${GREEN}✓${NC} No .DS_Store files found"
fi
echo ""

# Delete temp_* scripts
echo -e "${BLUE}[5/5]${NC} Removing temporary scripts..."
TEMP_COUNT=0
for file in temp_*; do
    if [ -e "$file" ]; then
        rm "$file"
        echo -e "${RED}✗${NC} Deleted: $file"
        ((TEMP_COUNT++))
    fi
done
if [ $TEMP_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No temporary scripts found"
else
    echo -e "${GREEN}✓${NC} Deleted $TEMP_COUNT temporary scripts"
fi
echo ""

# Update README.md with documentation links
echo -e "${BLUE}[BONUS]${NC} Updating README.md with archive links..."

# Check if README.md exists
if [ -f "README.md" ]; then
    # Add documentation index if not already present
    if ! grep -q "docs/archive" README.md; then
        cat >> README.md << 'EOF'

---

## 📂 Additional Documentation

Archived documentation can be found in the [`docs/archive/`](docs/archive/) directory:

- **Code Quality Reports**: Security audits and fix summaries
- **Development Guides**: Setup instructions and troubleshooting
- **Code Snippets**: Reference implementations

EOF
        echo -e "${GREEN}✓${NC} Added archive links to README.md"
    else
        echo -e "${YELLOW}⚠${NC}  Archive links already exist in README.md"
    fi
else
    echo -e "${RED}✗${NC} README.md not found"
fi
echo ""

# Create archive index
echo -e "${BLUE}[BONUS]${NC} Creating archive index..."
cat > "$ARCHIVE_DIR/INDEX.md" << 'EOF'
# Archived Documentation

This directory contains documentation files that were moved from the project root for organizational purposes.

## Contents

All `.md` files from the root directory (except `README.md`, `LICENSE`, and `CHANGELOG.md`) are archived here.

### Categories

- **Code Quality Reports**: Audit results and fix summaries
- **Development Guides**: Setup and troubleshooting documentation
- **API References**: Endpoint documentation
- **Code Snippets**: Reference implementations

## Accessing Documents

To view any archived document:
```bash
cat docs/archive/FILENAME.md
```

## Maintenance

This archive is organized by the `organize_repo.sh` script.
Run this script periodically to keep the repository root clean.
EOF
echo -e "${GREEN}✓${NC} Created: $ARCHIVE_DIR/INDEX.md"
echo ""

# Summary report
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║                  🎉 Cleanup Complete! 🎉                 ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo "  • Archived: $MD_COUNT documentation files"
echo "  • Deleted: $LOG_COUNT log files"
echo "  • Deleted: $DS_COUNT .DS_Store files"
echo "  • Deleted: $TEMP_COUNT temporary scripts"
echo ""
echo -e "${BLUE}Archive Location:${NC} $ARCHIVE_DIR/"
echo -e "${BLUE}Archive Index:${NC} $ARCHIVE_DIR/INDEX.md"
echo ""

# List archived files
if [ $MD_COUNT -gt 0 ]; then
    echo -e "${YELLOW}Archived Files:${NC}"
    ls -1 "$ARCHIVE_DIR"/*.md 2>/dev/null | sed 's|.*/||' | while read file; do
        echo "  • $file"
    done
    echo ""
fi

# Final recommendations
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Review archived files: cd $ARCHIVE_DIR && ls -la"
echo "  2. Commit changes: git add . && git commit -m 'chore: organize repository'"
echo "  3. Run production checks: ./fix_frontend_build.sh"
echo ""

exit 0

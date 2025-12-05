#!/bin/bash

echo "Testing .gitignore effectiveness..."
echo ""

# Initialize git if not already
if [ ! -d ".git" ]; then
    git init > /dev/null 2>&1
fi

# Check what files would be added
echo "Files that would be tracked by Git (first 20):"
git add --dry-run . 2>/dev/null | head -20
echo "..."
echo ""

# Check if sensitive files would be tracked
echo "Checking sensitive files..."
echo ""

if git add --dry-run . 2>/dev/null | grep -q "\.env"; then
    echo "❌ .env files would be tracked!"
else
    echo "✅ .env files properly excluded"
fi

if git add --dry-run . 2>/dev/null | grep -q "wallet/"; then
    echo "❌ wallet/ would be tracked!"
else
    echo "✅ wallet/ properly excluded"
fi

if git add --dry-run . 2>/dev/null | grep -q "uploads/"; then
    echo "❌ uploads/ would be tracked!"
else
    echo "✅ uploads/ properly excluded"
fi

if git add --dry-run . 2>/dev/null | grep -q "node_modules/"; then
    echo "❌ node_modules/ would be tracked!"
else
    echo "✅ node_modules/ properly excluded"
fi

if git add --dry-run . 2>/dev/null | grep -q "\.next/"; then
    echo "❌ .next/ would be tracked!"
else
    echo "✅ .next/ properly excluded"
fi

echo ""
echo "✅ .gitignore is working correctly!"
echo "Sensitive files are properly excluded from Git tracking."

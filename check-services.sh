#!/bin/bash

echo "=============================================="
echo "   HealthLink Status Check"
echo "=============================================="
echo ""

# Check backend
echo "🔍 Checking Backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend is running on port 3000"
    BACKEND_STATUS=$(curl -s http://localhost:3000/health | jq -r '.status')
    echo "   Status: $BACKEND_STATUS"
else
    echo "❌ Backend is NOT running"
    echo "   Start with: cd middleware-api && node src/server.js &"
fi

echo ""

# Check frontend
echo "🔍 Checking Frontend..."
if lsof -i:9002 > /dev/null 2>&1; then
    echo "✅ Frontend is running on port 9002"
else
    echo "❌ Frontend is NOT running"
    echo "   Start with: cd frontend && npm run dev &"
fi

echo ""

# Check if in Codespaces
if [ -n "$CODESPACE_NAME" ]; then
    echo "🌐 GitHub Codespaces Environment Detected"
    echo ""
    echo "Frontend URL (open this in your browser):"
    echo "   https://$CODESPACE_NAME-9002.app.github.dev/login"
    echo ""
    echo "Backend URL:"
    echo "   https://$CODESPACE_NAME-3000.app.github.dev"
    echo ""
    
    # Test Codespaces backend access
    echo "🔗 Testing Codespaces backend access..."
    if curl -s "https://$CODESPACE_NAME-3000.app.github.dev/health" > /dev/null 2>&1; then
        echo "✅ Backend is accessible via Codespaces URL"
    else
        echo "❌ Backend NOT accessible via Codespaces URL"
        echo "   Port 3000 may not be set to PUBLIC"
        echo "   Run: gh codespace ports visibility 3000:public"
    fi
else
    echo "💻 Local Development Environment"
    echo ""
    echo "Frontend URL:"
    echo "   http://localhost:9002/login"
    echo ""
    echo "Backend URL:"
    echo "   http://localhost:3000"
fi

echo ""
echo "🔑 Test Credentials:"
echo "   Email: patient@test.com"
echo "   Password: test123456"
echo ""
echo "=============================================="

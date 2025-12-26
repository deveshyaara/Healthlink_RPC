#!/bin/bash
set -e

echo "=== HealthLink Build Script for Render ==="

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Install Python 3 and pip
echo "Installing Python 3 and pip..."
apt-get update && apt-get install -y python3 python3-pip python3-venv

# Install Python dependencies for LangGraph agent
echo "Installing Python dependencies for LangGraph agent..."
cd python_agent
pip3 install --no-cache-dir -r requirements.txt
cd ..

echo "=== Build Complete - Node.js and Python Ready ==="

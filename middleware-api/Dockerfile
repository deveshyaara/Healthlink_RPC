# Use Node 20 on Debian Bookworm
FROM node:20-bookworm

# Install Python 3, pip, and venv
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- LAYER 1: Node & Prisma Dependencies ---
COPY package*.json ./

# !!! FIX: Copy Prisma files BEFORE npm install !!!
# This allows the "postinstall" script to find the schema
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies (triggers "npx prisma generate" automatically via postinstall)
RUN npm install

# (Optional) You can remove the explicit "RUN npx prisma generate" line
# because "npm install" just did it. But keeping it is harmless.

# --- LAYER 2: Python Dependencies (Cached) ---
COPY python_agent/requirements.txt ./python_agent/requirements.txt

RUN cd python_agent && \
    pip3 install --no-cache-dir -r requirements.txt --break-system-packages && \
    cd ..

# --- LAYER 3: Application Code ---
COPY . .

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
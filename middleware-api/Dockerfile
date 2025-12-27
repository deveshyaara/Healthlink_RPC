# Use Node 20 on Debian Bookworm (includes Python 3.11+)
FROM node:20-bookworm

# Install Python 3, pip, and venv
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- LAYER 1: Node Dependencies (Cached) ---
COPY package*.json ./

# Removed --only=production to ensure TypeScript/build tools are available.
# If you are strictly running compiled JS, you can add it back.
RUN npm install

# --- LAYER 2: Prisma Generation (Cached) ---
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# --- LAYER 3: Python Dependencies (Cached) ---
# We copy ONLY the requirements file first.
# This prevents re-installing all pip packages every time you change code.
COPY python_agent/requirements.txt ./python_agent/requirements.txt

RUN cd python_agent && \
    pip3 install --no-cache-dir -r requirements.txt --break-system-packages && \
    cd ..

# --- LAYER 4: Application Code ---
# Now we copy the actual source code. 
# This layer changes most often, so we put it last.
COPY . .

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
FROM node:18-bullseye

# Install Python 3 and pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files for Node.js
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install Node.js dependencies
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate

# Copy Python agent directory
COPY python_agent ./python_agent

# Install Python dependencies for LangGraph
RUN cd python_agent && \
    pip3 install --no-cache-dir -r requirements.txt && \
    cd ..

# Copy application source code
COPY . .

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
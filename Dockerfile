# ==============================================================================
# University Timetable Management Platform - Production Root Dockerfile
# Base: Node 22 (required for better-sqlite3 >= 13.0.0 and glibc stability)
# ==============================================================================
FROM node:22-bookworm-slim AS base

# Install build dependencies for native C++ modules and curl for health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root workspace and package manifests
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY shared/package.json* ./shared/
COPY frontend/package.json* ./frontend/

# Install dependencies
RUN npm ci --workspace=backend || npm install --workspace=backend

# Copy source code
COPY shared/ ./shared/
COPY backend/ ./backend/

# Rebuild native SQLite addon in target environment
WORKDIR /app/backend
RUN npm rebuild better-sqlite3

# Create persistent data directory
RUN mkdir -p /app/backend/data

# Environment configuration
ENV PORT=5000
ENV NODE_ENV=production
EXPOSE 5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the backend server directly with tsx
CMD ["npx", "tsx", "src/server.ts"]

# ==============================================================================
# University Timetable Management Platform - Production Root Dockerfile
# ==============================================================================
FROM node:20-alpine AS base

# Install build tools for native C++ SQLite bindings (better-sqlite3) and curl for health check
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Copy root workspace and package manifests first to leverage Docker layer caching
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY shared/package.json* ./shared/
COPY frontend/package.json* ./frontend/

# Install backend dependencies
RUN npm ci --workspace=backend || npm install --workspace=backend

# Rebuild native better-sqlite3 for Alpine Linux
WORKDIR /app/backend
RUN npm rebuild better-sqlite3

# Copy backend source code and shared domain models
WORKDIR /app
COPY shared/ ./shared/
COPY backend/ ./backend/

# Ensure SQLite data directory exists
RUN mkdir -p /app/backend/data

# Environment configuration
ENV PORT=5000
ENV NODE_ENV=production
EXPOSE 5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the backend server
WORKDIR /app/backend
CMD ["npx", "tsx", "src/server.ts"]

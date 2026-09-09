# ==============================================================================
# University Timetable Management Platform - Backend Dockerfile
# ==============================================================================
FROM node:20-alpine AS base

# Install native dependencies required for compiling better-sqlite3
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Copy root workspace configurations and package files
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/

# Install dependencies for the backend and workspace
RUN npm ci --workspace=backend || npm install --workspace=backend

# Copy backend source code and shared models/types
COPY backend/ ./backend/
COPY shared/ ./shared/

# Expose backend API port
ENV PORT=5000
ENV NODE_ENV=production
EXPOSE 5000

# Health check to ensure API router is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the backend server
WORKDIR /app/backend
CMD ["npx", "tsx", "src/server.ts"]

# ==============================================================================
# University Timetable Management Platform - Backend Dedicated Dockerfile
# ==============================================================================
FROM node:20-alpine AS base

# Install build tools for native C++ SQLite addon
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Copy package configurations
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/

# Install workspace dependencies
RUN npm ci --workspace=backend || npm install --workspace=backend

# Copy source files
COPY backend/ ./backend/
COPY shared/ ./shared/

# Runtime environment
ENV PORT=5000
ENV NODE_ENV=production
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Launch backend
WORKDIR /app/backend
CMD ["npx", "tsx", "src/server.ts"]

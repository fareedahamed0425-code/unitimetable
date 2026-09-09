# ==============================================================================
# University Timetable Management Platform - Backend Standalone Dockerfile
# Compatible with both Root Context and Backend Subdirectory Context on Render
# ==============================================================================
FROM node:20-alpine AS base

# Install build tools for native C++ SQLite bindings (better-sqlite3) and curl
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app/backend

# Copy package manifests
COPY package.json package-lock.json* ./

# Install dependencies and rebuild better-sqlite3 for Alpine Linux
RUN npm install --omit=dev || npm install
RUN npm rebuild better-sqlite3

# Copy backend source
COPY . .

# Ensure shared directory is populated at /app/shared for relative imports (../../../shared/types)
RUN mkdir -p /app/shared && \
    if [ -d "shared" ]; then cp -rf shared/* /app/shared/; fi

# Create SQLite data directory
RUN mkdir -p /app/backend/data

# Environment configuration
ENV PORT=5000
ENV NODE_ENV=production
EXPOSE 5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Launch the backend server
CMD ["npx", "tsx", "src/server.ts"]

# ==============================================================================
# University Timetable Management Platform - Backend Dedicated Dockerfile
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

WORKDIR /app/backend

# Copy package manifests
COPY package.json package-lock.json* ./

# Install dependencies including tsx and rebuild native SQLite
RUN npm install
RUN npm rebuild better-sqlite3

# Copy backend source
COPY . .

# Ensure shared types are available at /app/shared for relative imports (../../../shared/types)
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

# Launch backend
CMD ["npx", "tsx", "src/server.ts"]

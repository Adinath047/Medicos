# Stage 1: Build Frontend Client
FROM node:22-alpine AS client-builder

WORKDIR /app/client
# Copy package files and install dependencies
COPY client/package*.json ./
RUN npm ci

# Copy the rest of the client source and build
COPY client/ ./
RUN npm run build

# Stage 2: Build Backend Server
FROM node:22-alpine AS server-builder

WORKDIR /app/server
# Copy package files and install dependencies (production only)
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the server source
COPY server/ ./

# Stage 3: Runtime
FROM node:22-alpine AS runtime

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
# Store SQLite database in a dedicated data directory for volume mounting
ENV DB_PATH=/app/data/emr_data.sqlite3

# Create data directory with appropriate permissions
RUN mkdir -p /app/data && chown -R node:node /app/data

# Copy backend server code and dependencies
COPY --from=server-builder --chown=node:node /app/server /app/server

# Copy built frontend assets
COPY --from=client-builder --chown=node:node /app/client/dist /app/client/dist

# Use non-root user for security
USER node

# Expose the API and Web port
EXPOSE 3000

# Start the application
CMD ["node", "server/server.js"]

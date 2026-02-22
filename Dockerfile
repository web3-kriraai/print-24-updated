# Multi-stage build for Print24 - Client + Server in Single Container
# Stage 1: Build the client (frontend)
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci --production=false

# Copy client source code
COPY client/ ./

# Build the client (creates dist folder with static files)
RUN npm run build

# Stage 2: Build the server and serve both
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies for server
COPY server/package*.json ./
RUN npm ci --production

# Copy server source code
COPY server/ ./

# Copy built client files from client-builder stage
COPY --from=client-builder /app/client/dist ./client/dist
COPY --from=client-builder /app/client/public ./client/public

# Expose port (Cloud Run uses PORT env variable)
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server (which also serves the client)
CMD ["node", "src/server.js"]

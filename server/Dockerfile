# Production server build for Print24 with SSR support
FROM node:20-alpine
WORKDIR /app

# Install production dependencies for server
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server source code
COPY server/src ./src

# Copy pre-built client from client-dist directory
# The deploy script ensures client-dist exists before building Docker image
COPY server/client-dist ./client-dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port Cloud Run uses
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the server
CMD ["node", "src/server.js"]

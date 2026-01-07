FROM node:20-slim

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy pre-built dist folder
COPY dist/ ./dist/

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run the server
CMD ["node", "dist/server.js"]

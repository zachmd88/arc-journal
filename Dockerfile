# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the App
RUN npm run build

# Serve Stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets from build stage
# Standalone build creates a standalone folder with necessary node_modules
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Start command
CMD ["node", "server.js"]

# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Provide mock variables for Next.js build-time static generation
# The real values will be provided at runtime by Cloud Run Secrets
ENV NEXT_PUBLIC_FIREBASE_API_KEY=mock-key-for-build
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mock-domain
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=mock-project
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mock-bucket
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=mock-sender
ENV NEXT_PUBLIC_FIREBASE_APP_ID=mock-app-id

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

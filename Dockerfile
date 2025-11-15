# Build stage: install dependencies and build the app
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm via corepack
RUN corepack enable

# Copy lockfile and manifest first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build argument for Convex URL
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL

# Build the app
RUN pnpm build

# --- Runtime image ---
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm via corepack
RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy other necessary files
COPY --from=builder /app/convex.json ./convex.json

# Expose HTTP port
EXPOSE 80

# Set the port environment variable
ENV PORT=80

# Start the server
CMD ["node", "dist/server/server.js"]

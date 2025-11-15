# Multi-stage build: build Vite app with pnpm, then serve static files with nginx
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

# Build the app to the dist directory
RUN pnpm build

# --- Runtime image ---
FROM nginx:alpine AS runner

# Copy built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

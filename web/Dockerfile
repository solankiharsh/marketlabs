# MarketLabs Frontend Dockerfile
# Stage 1: Build
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies (needed for build)
ENV NODE_ENV=development
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build production version
RUN npm run build

# Stage 2: Production image (using nginx)
# Use specific version to avoid mirror registry issues
FROM nginx:1.25-alpine

# Copy build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY deploy/nginx-docker.conf /etc/nginx/conf.d/default.conf

# Default backend URL (override via Railway service variable)
ENV BACKEND_URL=https://zestful-laughter-production.up.railway.app

# Railway injects PORT env var — substitute it and BACKEND_URL into nginx config at runtime
CMD ["/bin/sh", "-c", "envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/conf.d/default.conf > /tmp/nginx.conf && mv /tmp/nginx.conf /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

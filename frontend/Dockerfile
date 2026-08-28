# Multi-stage build for frontend
# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production (Nginx)
FROM nginx:alpine AS production

# Copy custom nginx configs
COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginxjs && \
    adduser -S nginxjs -u 1001 -G nginxjs

# Fix permissions
RUN chown -R nginxjs:nginxjs /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    mkdir -p /run/nginx && chown -R nginxjs:nginxjs /run/nginx

USER nginxjs

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
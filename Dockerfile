FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
RUN apk add --no-cache libc6-compat
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine AS backend-deps
WORKDIR /app
RUN apk add --no-cache sqlite curl && rm -rf /var/cache/apk/*
COPY backend/package*.json ./
RUN npm ci --only=production --silent && npm cache clean --force

FROM node:18-alpine AS production
ENV NODE_ENV=production
ENV PORT=7965
ENV TZ=Asia/Shanghai

RUN apk add --no-cache nginx sqlite curl dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

WORKDIR /app

COPY --chown=nodejs:nodejs backend/ ./backend/
COPY --from=backend-deps --chown=nodejs:nodejs /app/node_modules ./backend/node_modules/
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/
COPY nginx.conf /etc/nginx/nginx.conf
COPY docker-start.sh /app/start.sh

RUN mkdir -p /app/data /app/logs /var/log/nginx /var/lib/nginx/logs /run/nginx && \
    chown -R nodejs:nodejs /app /var/log/nginx /var/lib/nginx /etc/nginx /run/nginx && \
    chmod 755 /app/data /app/logs /var/log/nginx /var/lib/nginx /var/lib/nginx/logs /etc/nginx /run/nginx && \
    chmod 644 /etc/nginx/nginx.conf && \
    chmod +x /app/start.sh

USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/start.sh"]
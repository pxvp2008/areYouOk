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
RUN npm ci --only=production --silent && npm cache clean --force && ls -la node_modules/

FROM node:18-alpine AS production
ENV NODE_ENV=production
ENV PORT=7965
ENV TZ=Asia/Shanghai

# 设置默认用户ID，可通过环境变量覆盖
ARG PUID=1001
ARG PGID=1001
ENV PUID=${PUID}
ENV PGID=${PGID}

RUN apk add --no-cache nginx sqlite curl dumb-init su-exec && \
    addgroup -g ${PUID}  -S nodejs && \
    adduser -S nodejs -u ${PUID}  && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

WORKDIR /app

COPY backend/ ./backend/
COPY --from=backend-deps /app/node_modules ./backend/node_modules/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist/
COPY nginx.conf /etc/nginx/nginx.conf
COPY docker-start.sh /app/start.sh
COPY docker-entrypoint.sh /app/entrypoint.sh

RUN mkdir -p /app/data /app/logs /var/log/nginx /var/lib/nginx/logs /run/nginx && \
    chmod 755 /app/data /app/logs /var/log/nginx /var/lib/nginx /var/lib/nginx/logs /etc/nginx /run/nginx && \
    chmod 644 /etc/nginx/nginx.conf && \
    chmod +x /app/start.sh /app/entrypoint.sh

# 移除USER指令，让entrypoint脚本处理用户切换
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

ENTRYPOINT ["dumb-init", "--", "/app/entrypoint.sh"]
CMD ["/app/start.sh"]

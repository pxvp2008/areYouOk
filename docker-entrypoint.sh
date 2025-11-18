#!/bin/sh
# docker-entrypoint.sh - Docker容器入口点脚本
# 支持动态用户ID权限调整

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [entrypoint] $*"
}

# 检查并设置用户权限
setup_user_permissions() {
    # 如果以root用户运行，检查是否需要切换用户
    if [ "$(id -u)" = "0" ]; then
        # 如果设置了PUID和PGID环境变量，则动态创建用户
        if [ -n "$PUID" ] && [ -n "$PGID" ]; then
            log "Setting up user with UID=${PUID} and GID=${PGID}"

            # 检查目标组是否已存在，如果不存在则创建
            if ! getent group $PGID >/dev/null 2>&1; then
                addgroup -g $PGID -S nodejs
            else
                # 组已存在，获取组名
                GROUP_NAME=$(getent group $PGID | cut -d: -f1)
                log "Using existing group: $GROUP_NAME (GID=$PGID)"
            fi

            # 检查目标用户是否已存在
            if ! id -u $PUID >/dev/null 2>&1; then
                # 用户不存在，创建新用户
                if [ "$GROUP_NAME" = "nodejs" ]; then
                    adduser -S nodejs -u $PUID -G nodejs -h /app
                else
                    adduser -S nodejs -u $PUID -G $GROUP_NAME -h /app
                fi
            else
                # 用户已存在，获取用户名
                USER_NAME=$(getent passwd $PUID | cut -d: -f1)
                log "Using existing user: $USER_NAME (UID=$PUID)"
            fi

            # 设置目录权限
            chown -R $PUID:$PGID /app /var/log/nginx /var/lib/nginx /etc/nginx /run/nginx 2>/dev/null || true

            # 如果存在数据目录，也要设置权限
            if [ -d "/app/data" ]; then
                chown -R $PUID:$PGID /app/data
            fi

            # 切换到指定用户执行命令
            log "Switching to user (UID=${PUID}, GID=${PGID})"
            if command -v su-exec >/dev/null 2>&1; then
                exec su-exec $PUID:$PGID "$@"
            else
                exec setpriv --reuid $PUID --regid $PGID --init-groups "$@"
            fi
        else
            # 没有设置PUID/PGID，使用默认的nodejs用户（UID=1001）
            log "Using default nodejs user (UID=1001)"

            # 确保nodejs用户存在
            if ! id nodejs >/dev/null 2>&1; then
                addgroup -g 1001 -S nodejs
                adduser -S nodejs -u 1001 -G nodejs -h /app
                chown -R nodejs:nodejs /app /var/log/nginx /var/lib/nginx /etc/nginx /run/nginx 2>/dev/null || true
            fi

            if command -v su-exec >/dev/null 2>&1; then
                exec su-exec nodejs "$@"
            else
                exec setpriv --reuid 1001 --regid 1001 --init-groups "$@"
            fi
        fi
    else
        # 非root用户运行，直接执行命令
        log "Running as current user (UID=$(id -u), GID=$(id -g))"
        exec "$@"
    fi
}

# 处理信号
cleanup() {
    log "Received shutdown signal, cleaning up..."
    # 如果有子进程需要清理，在这里处理
    exit 0
}

trap cleanup SIGTERM SIGINT

# 设置用户权限并执行命令
setup_user_permissions "$@"
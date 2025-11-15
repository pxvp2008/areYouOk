#!/bin/bash
# stop.sh - 停止服务脚本

echo "停止智谱AI GLM Coding Plan 账单统计系统"

# 从PID文件读取并停止服务
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    echo "停止后端服务 (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null && echo "后端服务已停止" || echo "警告: 后端服务可能已停止"
    rm .backend.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    echo "停止前端服务 (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null && echo "前端服务已停止" || echo "警告: 前端服务可能已停止"
    rm .frontend.pid
fi

# 强制清理可能残留的进程
echo "清理残留进程..."
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "node.*frontend" 2>/dev/null || true

echo "所有服务已停止"
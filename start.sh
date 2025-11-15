#!/bin/bash
# start.sh - 统一启动脚本

echo "启动智谱AI GLM Coding Plan 账单统计系统"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "错误: npm 未安装，请先安装 npm"
    exit 1
fi

# 1. 检查并创建必要的目录
mkdir -p data logs

# 2. 检查数据库
if [ ! -f "data/expense_bills.db" ]; then
    echo "初始化数据库..."
    cd backend
    if [ ! -d "node_modules" ]; then
        echo "安装后端依赖..."
        npm install
    fi
    npm run init-db
    cd ..
fi

# 3. 检查并安装后端依赖
if [ ! -d "backend/node_modules" ]; then
    echo "安装后端依赖..."
    cd backend && npm install && cd ..
fi

# 4. 检查并安装前端依赖
if [ ! -d "frontend/node_modules" ]; then
    echo "安装前端依赖..."
    cd frontend && npm install && cd ..
fi

# 清理可能存在的旧进程
echo "清理可能存在的旧进程..."
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "node.*frontend" 2>/dev/null || true
sleep 2

# 5. 启动后端（同时输出到控制台和日志文件）
echo "启动后端服务..."
cd backend
# 使用 tee 命令同时输出到控制台和文件
npm run dev 2>&1 | tee ../logs/backend.log &
BACKEND_PID=$!
cd ..

# 6. 等待后端启动
echo "等待后端服务启动..."
sleep 5

# 检查后端是否启动成功
if ! curl -s -f http://localhost:7965/api/ > /dev/null 2>&1; then
    echo "警告: 后端服务可能还在启动中，继续启动前端..."
fi

# 7. 启动前端
echo "启动前端服务..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 8. 等待前端启动
sleep 3

echo ""
echo "系统启动完成!"
echo "前端地址: http://localhost:3000"
echo "后端地址: http://localhost:7965"
echo "后端日志: logs/backend.log"
echo "前端日志: logs/frontend.log"
echo ""
echo "使用 Ctrl+C 停止所有服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 保存PID到文件，方便停止脚本使用
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# 定义停止服务的函数
cleanup() {
    echo ""
    echo "正在停止服务..."

    if [ -f .backend.pid ]; then
        BACKEND_PID=$(cat .backend.pid)
        kill $BACKEND_PID 2>/dev/null || true
        rm .backend.pid
    fi

    if [ -f .frontend.pid ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        kill $FRONTEND_PID 2>/dev/null || true
        rm .frontend.pid
    fi

    # 强制清理可能残留的进程
    pkill -f "node.*backend" 2>/dev/null || true
    pkill -f "node.*frontend" 2>/dev/null || true

    echo "所有服务已停止"
    exit 0
}

# 捕获中断信号
trap cleanup SIGINT SIGTERM

# 等待用户退出
wait $BACKEND_PID $FRONTEND_PID
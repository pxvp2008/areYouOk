# Docker 部署指南

智谱AI GLM Coding Plan 账单统计系统 Docker 容器化部署文档

## 🚀 快速开始

### 自动化脚本（推荐）

```bash
# 构建默认版本
./docker-build.sh

# 构建指定版本
./docker-build.sh 1.0.0

# 查看状态
./docker-build.sh status

# 查看日志
./docker-build.sh logs

# 停止服务
./docker-build.sh stop
```

### Docker Compose

```bash
# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 🏗️ 构建和运行

### 手动构建

```bash
# 构建镜像
docker build -t areyouok-app:latest .

# 运行容器
docker run -d \
  --name areyouok-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data:rw \
  -v $(pwd)/logs:/app/logs:rw \
  areyouok-app:latest
```

### 版本管理

```bash
# 构建指定版本
docker build -t areyouok-app:1.0.0 .

# 运行指定版本
docker run -d --name areyouok-app -p 3000:3000 \
  -v $(pwd)/data:/app/data:rw \
  -v $(pwd)/logs:/app/logs:rw \
  areyouok-app:1.0.0

# 查看镜像版本
docker images | grep areyouok-app
```

## ⚙️ 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `7965` | 后端API端口（容器内部） |
| `TZ` | `Asia/Shanghai` | 时区设置 |

### 数据卷

```bash
# SQLite 数据库持久化
-v $(pwd)/data:/app/data:rw

# 日志文件持久化
-v $(pwd)/logs:/app/logs:rw
```

### 端口说明

- `3000:3000` - 外部访问端口（Nginx前端服务）
- `7965` - 后端API端口（仅容器内部，通过Nginx代理访问）

## 🔍 健康检查

```bash
# 查看容器状态
docker ps --format "table {{.Names}}\t{{.Status}}"

# 手动健康检查
curl http://localhost:3000/health
curl http://localhost:3000/api/
```

## 📝 日志管理

```bash
# 查看容器日志
docker logs areyouok-app
docker logs -f areyouok-app

# 查看应用日志文件
tail -f logs/backend.log
tail -f logs/nginx.log
```

## 💾 数据备份

```bash
# 手动备份
docker run --rm \
  -v $(pwd)/data:/data:ro \
  -v $(pwd)/backups:/backups:rw \
  alpine:latest \
  tar -czf /backups/backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data expense_bills.db
```

## 🔧 故障排除

### 常见问题

#### 容器启动失败
```bash
# 查看启动日志
docker logs areyouok-app

# 重新构建镜像
docker build --no-cache -t areyouok-app .
```

#### 端口冲突
```bash
# 检查端口占用
lsof -i :3000

# 使用其他端口
docker run -d --name areyouok-app -p 8080:3000 areyouok-app
```

#### 数据库权限问题
```bash
# 修复权限
sudo chown -R 1001:1001 data/
```

#### 调试模式
```bash
# 进入容器
docker exec -it areyouok-app /bin/sh

# 查看进程状态
docker exec areyouok-app ps aux
```

## 🔄 更新升级

```bash
# 停止旧容器
docker stop areyouok-app
docker rm areyouok-app

# 重新构建镜像
docker build --no-cache -t areyouok-app .

# 启动新容器
docker run -d \
  --name areyouok-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data:rw \
  -v $(pwd)/logs:/app/logs:rw \
  areyouok-app
```

## 📞 访问地址

部署成功后的访问地址：

- **前端界面**: http://localhost:3000
- **后端API**: http://localhost:3000/api/
- **健康检查**: http://localhost:3000/health

## 📋 部署检查清单

### 部署前检查
- [ ] Docker和Docker Compose已安装
- [ ] 项目源代码已克隆
- [ ] 端口3000未被占用
- [ ] data和logs目录有写权限

### 部署后验证
- [ ] 容器启动成功
- [ ] 健康检查通过
- [ ] 前端页面可访问
- [ ] 后端API可访问
- [ ] 数据库初始化完成

---

**注意**: 首次运行时，系统会自动初始化SQLite数据库。请确保 `data/` 和 `logs/` 目录具有适当的写入权限。
# 智谱AI GLM Coding Plan 账单统计系统

一个专门用于智谱AI GLM Coding Plan套餐的账单管理和统计分析系统，帮助用户实时监控API使用量、Token消耗和费用支出。

## 系统特色

- **专注智谱AI**: 深度适配智谱AI GLM Coding Plan套餐
- **实时监控**: 近5小时/1天/1周/1月的API调用和Token消耗统计
- **智能同步**: 支持全量和增量同步，自动避免重复数据
- **数据本地化**: 使用SQLite3本地数据库，确保数据隐私安全
- **一键启动**: 提供便捷的启动脚本和Docker部署方案
- **丰富图表**: 多种图表类型展示，数据可视化直观

## 技术架构

### 后端技术栈
- **Node.js 16+** + **Express 4**: 高性能API服务器
- **SQLite3**: 轻量级本地数据库，零配置部署
- **Axios**: 调用智谱AI API的HTTP客户端

### 前端技术栈
- **Vue 3**: 现代化前端框架
- **Element Plus**: 企业级UI组件库
- **ECharts + Chart.js**: 专业数据可视化图表
- **Vite**: 快速构建工具

### 核心功能
- **数据同步模块**: 全量/增量同步账单数据，支持异步处理和进度监控
- **统计分析模块**: 多维度统计API使用量、Token消耗和费用支出
- **自动监控模块**: 定时同步数据，实时预警套餐使用情况
- **用户界面模块**: 响应式设计，支持多屏幕尺寸

## 快速开始

### 环境要求
- Node.js >= 16
- npm >= 8

### 方式一：一键启动

```bash
# 克隆项目
git clone git@github.com:pxvp2008/areYouOk.git
cd areYouOk

# 一键启动（自动安装依赖、初始化数据库、启动前后端服务）
./start.sh
```

启动完成后：
- 前端地址: http://localhost:3000
- 后端地址: http://localhost:7965

### 方式二：手动启动

```bash
# 1. 启动后端
cd backend
npm install
npm run init-db  # 初始化数据库
npm start        # 启动后端服务（端口：7965）

# 2. 启动前端（新开终端）
cd frontend
npm install
npm run dev      # 启动前端服务（端口：3000）
```

### 方式三：Docker部署

```bash
# 1. 使用Docker Compose部署（推荐）
docker-compose up -d

# 2. 使用docker run直接部署
docker run -d \
  --name areyouok-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data:rw \
  -v $(pwd)/logs:/app/logs:rw \
  -e NODE_ENV=production \
  -e TZ=Asia/Shanghai \
  pxvp2008/areyouok-app:latest
```

## 使用指南

### 1. 初始配置
1. 访问 http://localhost:3000
2. 首次使用会自动跳转到设置页面
3. 输入您的智谱AI API Token进行配置

### 2. 数据同步
1. 进入"数据同步"页面
2. 选择要同步的账单月份
3. 点击"开始同步"，系统会自动：
   - 调用智谱AI API获取账单数据
   - 智能处理timeWindow时间窗口
   - 从billingNo解析交易时间戳
   - 避免重复数据入库

### 3. 查看统计
系统提供多维度数据统计：
- **API使用统计**: 近5小时/1天/1周/1月的调用次数和增长率
- **Token消耗统计**: 输入/输出Token使用量和进度条显示
- **费用支出统计**: 累计花费金额和环比分析
- **产品分布统计**: 不同API产品的使用情况

### 4. 自动监控
- 配置自动同步频率（建议10秒）
- 系统会定期更新数据并实时显示统计结果
- 接近套餐限制时自动预警

## API接口

### 核心接口
```bash
# 同步账单数据
POST /api/bills/sync
Body: {"billingMonth": "2025-11"}

# 获取账单列表（分页）
GET /api/bills?page=1&pageSize=20&startDate=2025-11-01&endDate=2025-11-30

# 获取统计信息
GET /api/bills/stats?period=5h

# 获取同步状态
GET /api/bills/sync-status

# 获取API使用进度
GET /api/bills/api-usage-progress
```

### 配置接口
```bash
# 保存API Token
POST /api/tokens/save
Body: {"token": "your-api-token"}

# 配置自动同步
POST /api/auto-sync/config
Body: {"enabled": true, "interval": 10}
```

## 项目结构

```
areYouOk/
├── backend/                 # Node.js 后端服务
│   ├── src/
│   │   ├── controllers/     # 控制器层
│   │   ├── services/        # 业务逻辑层
│   │   ├── models/          # 数据模型
│   │   ├── database/        # 数据库配置
│   │   ├── routes/          # 路由定义
│   │   └── utils/           # 工具函数
│   └── package.json
├── frontend/                # Vue3 前端应用
│   ├── src/
│   │   ├── views/           # 页面组件
│   │   ├── components/      # 公共组件
│   │   ├── api/             # API接口
│   │   ├── router/          # 路由配置
│   │   └── utils/           # 工具函数
│   └── package.json
├── data/                    # SQLite数据库文件
├── logs/                    # 日志文件
├── docker-compose.yml       # Docker部署配置
├── docker-build.sh          # Docker构建脚本
├── start.sh                 # 一键启动脚本
└── stop.sh                  # 停止服务脚本
```

## 数据库设计

### 核心数据表
- **expense_bills**: 账单明细表（70+字段，完整映射智谱AI数据）
- **api_tokens**: API Token配置表
- **sync_history**: 同步历史记录表
- **auto_sync_config**: 自动同步配置表
- **membership_tier_limits**: 会员等级限制表

### 特色字段
- `transaction_time`: 从billingNo智能解析的时间戳（精确到毫秒）
- `time_window_start/end`: 拆分后的时间窗口字段
- `create_time`: 数据入库时间戳

## 常见问题

### Q: 数据同步失败怎么办？
A: 检查API Token是否正确，网络连接是否正常，查看日志文件了解详细错误信息。

### Q: 如何停止服务？
A: 使用 `./stop.sh` 脚本可以优雅停止所有服务，或使用 `Ctrl+C` 中断启动脚本。

## 开源协议

MIT License

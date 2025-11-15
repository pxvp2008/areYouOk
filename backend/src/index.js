// 后端入口文件
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config();

// 引入路由
const billRoutes = require('./routes/billRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const autoSyncRoutes = require('./routes/autoSyncRoutes');

// 引入服务
const autoSyncService = require('./services/autoSyncService');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 7965;

// 中间件
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 解析JSON请求体
app.use(express.urlencoded({ extended: true })); // 解析URL编码的请求体

// API路由
app.use('/api/bills', billRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/auto-sync', autoSyncRoutes);

// 根路径
app.get('/', (req, res) => {
    res.json({
        message: '智谱AI GLM Coding Plan 账单统计 API',
        version: '1.0.0',
        endpoints: {
            sync: 'POST /api/bills/sync - 同步账单数据',
            list: 'GET /api/bills - 获取账单列表',
            products: 'GET /api/bills/products - 获取产品列表',
            stats: 'GET /api/bills/stats - 获取统计信息',
            status: 'GET /api/bills/sync-status - 获取同步状态',
            tokenSave: 'POST /api/tokens/save - 保存Token',
            tokenGet: 'GET /api/tokens/get - 获取Token'
        }
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API路径不存在'
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`  智谱AI GLM Coding Plan 账单统计 API`);
    console.log(`  端口: ${PORT}`);
    console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=================================`);
    console.log(`\n可用接口:`);
    console.log(`  POST /api/bills/sync - 同步账单数据`);
    console.log(`  GET /api/bills - 获取账单列表`);
    console.log(`  GET /api/bills/products - 获取产品列表`);
    console.log(`  GET /api/bills/stats - 获取统计信息`);
    console.log(`  GET /api/bills/sync-status - 获取同步状态`);
    console.log(`  POST /api/tokens/save - 保存Token`);
    console.log(`  GET /api/tokens/get - 获取Token`);
    console.log(`  GET /api/auto-sync/config - 获取自动同步配置`);
    console.log(`  POST /api/auto-sync/config - 保存自动同步配置`);
    console.log(`  POST /api/auto-sync/trigger - 触发自动同步`);
    console.log(`  POST /api/auto-sync/stop - 停止自动同步`);
    console.log(`\n=================================`);

    // 启动自动同步服务
    autoSyncService.start();
});

// 优雅关闭
process.on('SIGTERM', () => {
    shutdown();
});

process.on('SIGINT', () => {
    console.log('\n收到SIGINT信号，正在关闭服务器...');
    shutdown();
});

/**
 * 优雅关闭服务器
 */
function shutdown() {
    console.log('正在停止自动同步服务...');
    autoSyncService.stop();

    setTimeout(() => {
        console.log('服务器已关闭');
        process.exit(0);
    }, 1000);
}

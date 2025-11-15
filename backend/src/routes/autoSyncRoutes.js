// 自动同步配置路由
const express = require('express');
const router = express.Router();
const autoSyncController = require('../controllers/autoSyncController');

// 获取自动同步配置
router.get('/config', autoSyncController.getConfig.bind(autoSyncController));

// 保存自动同步配置
router.post('/config', autoSyncController.saveConfig.bind(autoSyncController));

// 立即触发一次自动同步
router.post('/trigger', autoSyncController.triggerSync.bind(autoSyncController));

// 停止自动同步
router.post('/stop', autoSyncController.stopSync.bind(autoSyncController));

module.exports = router;

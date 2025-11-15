// Token路由
// 单用户系统，但保留Token验证功能（用于设置页面和引导页验证智谱AI Token）
const express = require('express');
const router = express.Router();
const TokenController = require('../controllers/tokenController');

// 验证Token（用于设置页面和引导页）
router.post('/verify', TokenController.verifyToken);

// 保存Token
router.post('/save', TokenController.saveToken);

// 获取Token
router.get('/get', TokenController.getToken);

// 删除Token
router.delete('/delete', TokenController.deleteToken);

module.exports = router;

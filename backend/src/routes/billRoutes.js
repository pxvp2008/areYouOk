// 账单相关API路由
// 单用户系统，无需认证
const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');

// 同步账单数据
router.post('/sync', billController.syncBills.bind(billController));

// 获取账单列表
router.get('/', billController.getBills.bind(billController));

// 获取产品列表
router.get('/products', billController.getProducts.bind(billController));

// 获取expense_bills表记录总数
router.get('/count', billController.getTotalCount.bind(billController));

// 获取账单统计信息
router.get('/stats', billController.getStats.bind(billController));

// 获取同步状态
router.get('/sync-status', billController.getSyncStatus.bind(billController));

// 保存同步历史记录
router.post('/sync-history', billController.saveSyncHistory.bind(billController));

// 获取同步历史记录
router.get('/sync-history', billController.getSyncHistory.bind(billController));

// 获取当前会员等级
router.get('/current-membership-tier', billController.getCurrentMembershipTier.bind(billController));

// 获取API使用进度
router.get('/api-usage-progress', billController.getApiUsageProgress.bind(billController));

// 获取Token使用量统计
router.get('/token-usage-progress', billController.getTokenUsageProgress.bind(billController));

// 获取累计花费金额统计
router.get('/total-cost-progress', billController.getTotalCostProgress.bind(billController));

// 获取每小时调用次数和Token数量
router.get('/hourly-usage', billController.getHourlyUsage.bind(billController));

// 获取每天调用次数和Token数量
router.get('/daily-usage', billController.getDailyUsage.bind(billController));

// 获取产品分布统计（按model_product_name分组，统计sum(api_usage)）
router.get('/product-distribution', billController.getProductDistribution.bind(billController));

// 获取近1天API使用量统计
router.get('/day-api-usage', billController.getDayApiUsage.bind(billController));

// 获取近1天Token使用量统计
router.get('/day-token-usage', billController.getDayTokenUsage.bind(billController));

// 获取近1天累计花费金额统计
router.get('/day-total-cost', billController.getDayTotalCost.bind(billController));

// 获取近1周API使用量统计
router.get('/week-api-usage', billController.getWeekApiUsage.bind(billController));

// 获取近1周Token使用量统计
router.get('/week-token-usage', billController.getWeekTokenUsage.bind(billController));

// 获取近1周累计花费金额统计
router.get('/week-total-cost', billController.getWeekTotalCost.bind(billController));

// 获取近1月API使用量统计
router.get('/month-api-usage', billController.getMonthApiUsage.bind(billController));

// 获取近1月Token使用量统计
router.get('/month-token-usage', billController.getMonthTokenUsage.bind(billController));

// 获取近1月累计花费金额统计
router.get('/month-total-cost', billController.getMonthTotalCost.bind(billController));

module.exports = router;

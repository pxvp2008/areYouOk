// 账单控制器
// 处理HTTP请求和响应
const syncService = require('../services/syncService');
const Bill = require('../database/models/Bill');
const SyncHistory = require('../database/models/SyncHistory');
const MembershipTierLimit = require('../database/models/MembershipTierLimit');

class BillController {
    /**
     * 同步账单数据
     * POST /api/bills/sync
     * body: { billingMonth: '2025-11', type: 'full' | 'incremental' }
     */
    async syncBills(req, res) {
        try {
            const { billingMonth, type = 'full' } = req.body;

            // 验证参数
            if (!billingMonth) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必要参数: billingMonth'
                });
            }

            // 验证日期格式
            const monthRegex = /^\d{4}-\d{2}$/;
            if (!monthRegex.test(billingMonth)) {
                return res.status(400).json({
                    success: false,
                    message: 'billingMonth格式不正确，应为YYYY-MM格式'
                });
            }

            // 检查是否正在同步
            if (syncService.isSyncing()) {
                return res.status(409).json({
                    success: false,
                    message: '数据同步正在进行中，请稍后再试'
                });
            }

            // 对于全量同步，使用新的异步启动方法
            if (type === 'full') {
                const result = await syncService.startSync(billingMonth);
                res.json(result);
            } else {
                // 增量同步仍然使用同步方式
                const result = await syncService.incrementalSync(billingMonth);
                res.json({
                    success: true,
                    message: '增量数据同步完成',
                    data: result
                });
            }

        } catch (error) {
            console.error('同步账单数据失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '同步失败'
            });
        }
    }

    /**
     * 获取账单列表
     * GET /api/bills
     * query: { page=1, pageSize=20, startDate, endDate, productName }
     */
    async getBills(req, res) {
        try {
            const {
                page = 1,
                pageSize = 20,
                startDate,
                endDate,
                productName,
                productNames
            } = req.query;

            // 单用户系统，无需认证
            const result = await Bill.findAll({
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                startDate,
                endDate,
                productName,
                productNames
            });

            res.json({
                success: true,
                message: '获取成功',
                data: result
            });

        } catch (error) {
            console.error('获取账单列表失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 验证Token是否有效
     * @param {string} token - 要验证的token
     * @returns {Promise<boolean>} 验证结果
     */
    static async verifyToken(token) {
        try {
            // 使用提供的token调用智谱AI API
            const axios = require('axios');
            const authHeader = `Bearer ${token}`

            const response = await axios.get('https://bigmodel.cn/api/finance/expenseBill/expenseBillList', {
                params: {
                    billingMonth: '2025-11',
                    pageNum: 1,
                    pageSize: 1
                },
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            // 检查API返回状态
            if (response.data && response.data.code === 200) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取账单统计信息
     * GET /api/bills/stats
     * query: { period: '5h' | '1d' | '1m' }
     */
    async getStats(req, res) {
        try {
            const { period = '5h' } = req.query;

            const stats = await Bill.getStatistics(period);

            res.json({
                success: true,
                message: '获取成功',
                data: stats
            });

        } catch (error) {
            console.error('获取统计信息失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取同步状态
     * GET /api/bills/sync-status
     */
    async getSyncStatus(req, res) {
        try {
            const isSyncing = syncService.isSyncing();
            const progress = syncService.getProgress();

            res.json({
                success: true,
                data: {
                    syncing: isSyncing,
                    ...progress
                }
            });

        } catch (error) {
            console.error('获取同步状态失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取产品列表
     * GET /api/bills/products
     */
    async getProducts(req, res) {
        try {
            // 单用户系统，无需认证
            const products = await Bill.getProductList();

            res.json({
                success: true,
                message: '获取成功',
                data: products
            });

        } catch (error) {
            console.error('获取产品列表失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 保存同步历史记录
     * POST /api/bills/sync-history
     * body: { sync_type, billing_month, status, synced_count, failed_count, total_count, message, duration }
     */
    async saveSyncHistory(req, res) {
        try {
            const {
                sync_type,
                billing_month,
                status,
                synced_count = 0,
                failed_count = 0,
                total_count = 0,
                message = '',
                duration = 0
            } = req.body;

            // 验证参数
            if (!sync_type || !billing_month || !status) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必要参数: sync_type, billing_month, status'
                });
            }

            // 验证同步类型
            if (!['incremental', 'full'].includes(sync_type)) {
                return res.status(400).json({
                    success: false,
                    message: 'sync_type 必须是 incremental 或 full'
                });
            }

            const history = await SyncHistory.create({
                sync_type,
                billing_month,
                status,
                synced_count,
                failed_count,
                total_count,
                message,
                duration
            });

            res.json({
                success: true,
                message: '保存成功',
                data: history
            });

        } catch (error) {
            console.error('保存同步历史记录失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '保存失败'
            });
        }
    }

    /**
     * 获取同步历史记录
     * GET /api/bills/sync-history
     * query: { sync_type: 'incremental' | 'full', limit: 10, offset: 0 }
     */
    async getSyncHistory(req, res) {
        try {
            const { sync_type, limit = 10, offset = 0 } = req.query;

            let result;
            if (sync_type && ['incremental', 'full'].includes(sync_type)) {
                result = await SyncHistory.findByTypePaginated(sync_type, parseInt(limit), parseInt(offset));
                // result 格式: { data: [...], total: number }
                res.json({
                    success: true,
                    message: '获取成功',
                    data: result.data,
                    total: result.total
                });
            } else {
                result = await SyncHistory.findAll(parseInt(limit));
                // 非分页查询不提供总条数
                res.json({
                    success: true,
                    message: '获取成功',
                    data: result
                });
            }

        } catch (error) {
            console.error('获取同步历史记录失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取expense_bills表的记录总数
     * GET /api/bills/count
     * 用于自动同步功能校验：检查是否有基础数据
     */
    async getTotalCount(req, res) {
        try {
            const count = await Bill.getTotalCount();

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    total: count,
                    hasData: count > 0
                }
            });

        } catch (error) {
            console.error('获取记录总数失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取当前会员等级
     * GET /api/bills/current-membership-tier
     * 从数据库expense_bills表中，根据transaction_time字段倒序取top1的token_resource_name
     */
    async getCurrentMembershipTier(req, res) {
        try {
            const membershipTier = await Bill.getCurrentMembershipTier();

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    membershipTier
                }
            });

        } catch (error) {
            console.error('获取当前会员等级失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取API使用进度
     * GET /api/bills/api-usage-progress
     */
    async getApiUsageProgress(req, res) {
        try {
            // 1. 获取当前会员等级（token_resource_name格式）
            const membershipTier = await Bill.getCurrentMembershipTier();

            // 2. 使用智能匹配方法获取该会员等级的调用次数限制
            // 能正确处理"GLM Coding Lite - 包季计划"与"GLM Coding Lite"的匹配
            const tierLimit = await MembershipTierLimit.getLimitByTokenResourceName(membershipTier);

            // 3. 获取近5小时的实际使用量
            const recentUsage = await Bill.getRecentApiUsage(5);

            // 4. 计算小时级环比增长率（当前1小时 vs 前1小时）
            const growthRate = await Bill.getHourlyGrowthRate();

            // 5. 计算进度
            const used = recentUsage;
            const limit = tierLimit.call_limit;
            const percentage = Math.min(Math.round((used / limit) * 100), 100);
            const remaining = Math.max(limit - used, 0);

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    membershipTier,
                    used,
                    limit,
                    percentage,
                    remaining,
                    periodHours: tierLimit.period_hours,
                    growthRate,
                    // 统计维度说明
                    dimensions: {
                        usedLabel: '近5小时调用次数',
                        usedPeriod: '过去5小时',
                        growthRateLabel: '小时级环比增长率',
                        growthRatePeriod: '当前1小时 vs 前1小时'
                    }
                }
            });

        } catch (error) {
            console.error('获取API使用进度失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取Token使用量统计
     * GET /api/bills/token-usage-progress
     */
    async getTokenUsageProgress(req, res) {
        try {
            // 1. 获取近5小时的Token使用总量（deduct_usage字段求和）
            const recentUsage = await Bill.getRecentDeductUsage(5);

            // 2. 计算Token使用量的小时级环比增长率
            const growthRate = await Bill.getDeductUsageHourlyGrowthRate();

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    used: recentUsage,
                    growthRate,
                    // 统计维度说明
                    dimensions: {
                        usedLabel: '近5小时Token使用量',
                        usedPeriod: '过去5小时',
                        growthRateLabel: '小时级环比增长率',
                        growthRatePeriod: '当前1小时 vs 前1小时'
                    }
                }
            });

        } catch (error) {
            console.error('获取Token使用量统计失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取累计花费金额统计
     * GET /api/bills/total-cost-progress
     */
    async getTotalCostProgress(req, res) {
        try {
            // 1. 获取近5小时的总花费金额
            // 计算公式：SUM(cost_price/1000 * deduct_usage)
            const recentCost = await Bill.getRecentTotalCost(5);

            // 2. 计算总花费金额的小时级环比增长率
            const growthRate = await Bill.getTotalCostHourlyGrowthRate();

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    used: recentCost,
                    growthRate,
                    // 统计维度说明
                    dimensions: {
                        usedLabel: '近5小时累计花费金额',
                        usedPeriod: '过去5小时',
                        growthRateLabel: '小时级环比增长率',
                        growthRatePeriod: '当前1小时 vs 前1小时'
                    }
                }
            });

        } catch (error) {
            console.error('获取累计花费金额统计失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取每小时调用次数和Token数量
     * GET /api/bills/hourly-usage
     * query: { hours = 5 }
     */
    async getHourlyUsage(req, res) {
        try {
            const { hours = 5 } = req.query;

            const hourlyData = await Bill.getHourlyUsage(parseInt(hours));

            res.json({
                success: true,
                message: '获取成功',
                data: hourlyData
            });

        } catch (error) {
            console.error('获取每小时调用次数和Token数量失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取每天调用次数和Token数量
     * GET /api/bills/daily-usage
     * query: { days = 7 }
     */
    async getDailyUsage(req, res) {
        try {
            const { days = 7 } = req.query;

            const dailyData = await Bill.getDailyUsage(parseInt(days));

            res.json({
                success: true,
                message: '获取成功',
                data: dailyData
            });

        } catch (error) {
            console.error('获取每天调用次数和Token数量失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取产品分布统计（按model_product_name分组，统计sum(api_usage)）
     * GET /api/bills/product-distribution
     * query: { hours = 5 }
     */
    async getProductDistribution(req, res) {
        try {
            const { hours = 5 } = req.query;

            const productData = await Bill.getProductDistributionByHours(parseInt(hours));

            res.json({
                success: true,
                message: '获取成功',
                data: productData
            });

        } catch (error) {
            console.error('获取产品分布统计失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取近1天API使用量统计
     * GET /api/bills/day-api-usage
     */
    async getDayApiUsage(req, res) {
        try {
            const usage = await Bill.getRecentApiUsage(24);

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    used: usage
                }
            });

        } catch (error) {
            console.error('获取近1天API使用量失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取近1天Token使用量统计
     * GET /api/bills/day-token-usage
     */
    async getDayTokenUsage(req, res) {
        try {
            const usage = await Bill.getRecentDeductUsage(24);

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    used: usage
                }
            });

        } catch (error) {
            console.error('获取近1天Token使用量失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取近1天累计花费金额统计
     * GET /api/bills/day-total-cost
     */
    async getDayTotalCost(req, res) {
        try {
            const cost = await Bill.getRecentTotalCost(24);

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    used: cost
                }
            });

        } catch (error) {
            console.error('获取近1天累计花费金额失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取近1周API使用量统计
     * GET /api/bills/week-api-usage
     */
    async getWeekApiUsage(req, res) {
        try {
            const usage = await Bill.getRecentApiUsage(168);

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    used: usage
                }
            });

        } catch (error) {
            console.error('获取近1周API使用量失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取近1周Token使用量统计
     * GET /api/bills/week-token-usage
     */
    async getWeekTokenUsage(req, res) {
        try {
            const usage = await Bill.getRecentDeductUsage(168);

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    used: usage
                }
            });

        } catch (error) {
            console.error('获取近1周Token使用量失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取近1周累计花费金额统计
     * GET /api/bills/week-total-cost
     */
    async getWeekTotalCost(req, res) {
        try {
            const cost = await Bill.getRecentTotalCost(168);

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    used: cost
                }
            });

        } catch (error) {
            console.error('获取近1周累计花费金额失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取近1月API使用量统计
     * GET /api/bills/month-api-usage
     */
    async getMonthApiUsage(req, res) {
        try {
            const usage = await Bill.getRecentApiUsage(720);

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    used: usage
                }
            });

        } catch (error) {
            console.error('获取近1月API使用量失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取近1月Token使用量统计
     * GET /api/bills/month-token-usage
     */
    async getMonthTokenUsage(req, res) {
        try {
            const usage = await Bill.getRecentDeductUsage(720);

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    used: usage
                }
            });

        } catch (error) {
            console.error('获取近1月Token使用量失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }

    /**
     * 获取近1月累计花费金额统计
     * GET /api/bills/month-total-cost
     */
    async getMonthTotalCost(req, res) {
        try {
            const cost = await Bill.getRecentTotalCost(720);

            res.json({
                success: true,
                message: '获取成功',
                data: {
                    used: cost
                }
            });

        } catch (error) {
            console.error('获取近1月累计花费金额失败:', error);
            res.status(500).json({
                success: false,
                message: error.message || '获取失败'
            });
        }
    }
}

module.exports = new BillController();

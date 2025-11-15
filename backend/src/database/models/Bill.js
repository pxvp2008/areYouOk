// 账单数据模型
const db = require('../connection');
/**
 * 生成UUID（无连字符）
 * @returns {string} UUID字符串
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }).replace(/-/g, '');
}
class Bill {
    /**
     * 插入账单记录
     * @param {Object} billData - 账单数据
     * @returns {Promise}
     */
    static create(billData) {
        return new Promise((resolve, reject) => {
            // 数据转换和字段映射已在syncService中完成
            // billData 已经是转换后的数据（snake_case格式）
            const transformedData = billData;
            // 生成UUID作为主键
            const id = generateUUID();
            // 幂等性INSERT语句（INSERT OR IGNORE）- 避免重复插入错误
            const sql = `
                INSERT INTO expense_bills (
                    id, billing_no, billing_date, billing_time, order_no, customer_id,
                    api_key, model_code, model_product_type, model_product_subtype,
                    model_product_code, model_product_name, payment_type, start_time,
                    end_time, business_id, cost_price, cost_unit, usage_count,
                    usage_exempt, usage_unit, currency, settlement_amount,
                    gift_deduct_amount, due_amount, paid_amount, unpaid_amount,
                    billing_status, invoicing_amount, invoiced_amount,
                    token_account_id, token_resource_no, token_resource_name,
                    deduct_usage, deduct_after, time_window, time_window_start,
                    time_window_end, original_amount, original_cost_price,
                    api_usage, discount_rate, discount_type, credit_pay_amount,
                    token_type, cash_amount, third_party, transaction_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
                id, transformedData.billing_no, transformedData.billing_date,
                transformedData.billing_time, transformedData.order_no,
                transformedData.customer_id, transformedData.api_key,
                transformedData.model_code, transformedData.model_product_type,
                transformedData.model_product_subtype,
                transformedData.model_product_code,
                transformedData.model_product_name, transformedData.payment_type,
                transformedData.start_time, transformedData.end_time,
                transformedData.business_id, transformedData.cost_price,
                transformedData.cost_unit, transformedData.usage_count,
                transformedData.usage_exempt, transformedData.usage_unit,
                transformedData.currency, transformedData.settlement_amount,
                transformedData.gift_deduct_amount, transformedData.due_amount,
                transformedData.paid_amount, transformedData.unpaid_amount,
                transformedData.billing_status, transformedData.invoicing_amount,
                transformedData.invoiced_amount, transformedData.token_account_id,
                transformedData.token_resource_no, transformedData.token_resource_name,
                transformedData.deduct_usage, transformedData.deduct_after,
                transformedData.time_window, transformedData.time_window_start,
                transformedData.time_window_end, transformedData.original_amount,
                transformedData.original_cost_price, transformedData.api_usage,
                transformedData.discount_rate, transformedData.discount_type,
                transformedData.credit_pay_amount, transformedData.token_type,
                transformedData.cash_amount, transformedData.third_party,
                transformedData.transaction_time
            ];
            db.run(sql, params, function(err) {
                if (err) {
                    console.error('插入账单记录失败:', {
                        billing_no: transformedData.billing_no,
                        error: err.message,
                        code: err.code
                    });
                    reject(err);
                } else {
                    resolve({ id, ...transformedData, changes: this.changes });
                }
            });
        });
    }
    /**
     * 获取账单列表（分页）
     * @param {Object} options - 查询选项
     * @param {number} options.page - 页码
     * @param {number} options.pageSize - 每页大小
     * @param {string} options.startDate - 开始日期
     * @param {string} options.endDate - 结束日期
     * @returns {Promise<{rows: Array, total: number}>}
     */
    static findAll(options = {}) {
        return new Promise((resolve, reject) => {
            const {
                page = 1,
                pageSize = 20,
                startDate,
                endDate,
                productName,
                productNames
            } = options;
            let whereClause = '';
            const params = [];
            // 处理产品名称过滤
            if (productNames && Array.isArray(productNames) && productNames.length > 0) {
                const placeholders = productNames.map(() => '?').join(',');
                whereClause += ` WHERE model_product_name IN (${placeholders})`;
                params.push(...productNames);
            } else if (productName) {
                whereClause += ' WHERE model_product_name = ?';
                params.push(productName);
            }
            if (startDate) {
                whereClause += whereClause ? ' AND transaction_time >= ?' : ' WHERE transaction_time >= ?';
                params.push(startDate + ' 00:00:00');
            }
            if (endDate) {
                whereClause += whereClause ? ' AND transaction_time <= ?' : ' WHERE transaction_time <= ?';
                params.push(endDate + ' 23:59:59');
            }
            // 查询总数
            const countSql = `SELECT COUNT(*) as total FROM expense_bills ${whereClause}`;
            db.get(countSql, params, (err, countResult) => {
                if (err) {
                    reject(err);
                    return;
                }
                // 查询数据
                const offset = (page - 1) * pageSize;
                const dataSql = `
                    SELECT * FROM expense_bills
                    ${whereClause}
                    ORDER BY transaction_time DESC
                    LIMIT ? OFFSET ?
                `;
                const dataParams = [...params, pageSize, offset];
                db.all(dataSql, dataParams, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            rows,
                            total: countResult.total
                        });
                    }
                });
            });
        });
    }
    /**
     * 获取统计信息
     * @param {string} period - 统计周期 (5h, 1d, 1m)
     * @returns {Promise<Object>}
     */
    static getStatistics(period = '5h') {
        return new Promise((resolve, reject) => {
            let timeCondition = '';
            const now = new Date();
            if (period === '5h') {
                const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
                timeCondition = `WHERE time_window_start >= '${fiveHoursAgo.toISOString()}'`;
            } else if (period === '1d') {
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                timeCondition = `WHERE time_window_start >= '${oneDayAgo.toISOString()}'`;
            } else if (period === '1m') {
                const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                timeCondition = `WHERE time_window_start >= '${oneMonthAgo.toISOString()}'`;
            }
            // 统计调用次数
            const countSql = `
                SELECT
                    COUNT(*) as callCount,
                    SUM(usage_count) as totalTokens,
                    SUM(api_usage) as apiUsageCount
                FROM expense_bills
                ${timeCondition}
            `;
            db.get(countSql, [], (err, stats) => {
                if (err) {
                    reject(err);
                } else {
                    // 获取会员等级统计
                    db.all(`
                        SELECT
                            token_resource_name,
                            SUM(usage_count) as totalUsage,
                            COUNT(*) as callCount
                        FROM expense_bills
                        ${timeCondition}
                        GROUP BY token_resource_name
                    `, [], (err, resourceStats) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({
                                callCount5h: stats.callCount || 0,
                                totalTokens: stats.totalTokens || 0,
                                apiUsageCount: stats.apiUsageCount || 0,
                                resourceStats: resourceStats || []
                            });
                        }
                    });
                }
            });
        });
    }
    /**
     * 获取近5小时的统计数据（快捷方法）
     * @returns {Promise<Object>}
     */
    static getRecentStats() {
        return this.getStatistics('5h');
    }
    /**
     * 获取所有产品名称列表
     * @returns {Promise<Array>} 产品名称列表
     */
    static getProductList() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT DISTINCT model_product_name
                FROM expense_bills
                WHERE model_product_name IS NOT NULL
                AND model_product_name != ''
                ORDER BY model_product_name
            `;
            db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => row.model_product_name));
                }
            });
        });
    }
    /**
     * 获取最新的transaction_time时间戳
     * @returns {Promise<string|null>} 最新的transaction_time字符串，格式：YYYY-MM-DD HH:mm:ss
     */
    static getLatestTransactionTime() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT transaction_time
                FROM expense_bills
                WHERE transaction_time IS NOT NULL
                ORDER BY transaction_time DESC
                LIMIT 1
            `;
            db.get(sql, [], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? row.transaction_time : null);
                }
            });
        });
    }
    /**
     * 获取expense_bills表的记录总数
     * @returns {Promise<number>} 记录总数
     */
    static getTotalCount() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) as count FROM expense_bills`;
            db.get(sql, [], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result.count);
                }
            });
        });
    }

    /**
     * 获取最新的会员等级（从expense_bills表中根据transaction_time倒序取top1的token_resource_name）
     * @returns {Promise<string>} 最新的会员等级名称
     */
    static async getCurrentMembershipTier() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT token_resource_name
                FROM expense_bills
                WHERE token_resource_name IS NOT NULL
                ORDER BY transaction_time DESC
                LIMIT 1
            `;
            db.get(sql, [], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    // 如果没有找到记录，返回默认会员等级
                    resolve(result ? result.token_resource_name : 'GLM Coding Pro');
                }
            });
        });
    }

    /**
     * 清空expense_bills表中的所有数据
     * @returns {Promise<{count: number}>} 被删除的记录数
     */
    static deleteAll() {
        return new Promise((resolve, reject) => {
            // 首先获取记录总数
            const countSql = `SELECT COUNT(*) as count FROM expense_bills`;
            db.get(countSql, [], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                const count = result.count;
                // 清空表
                const deleteSql = `DELETE FROM expense_bills`;
                db.run(deleteSql, [], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ count, changes: this.changes });
                    }
                });
            });
        });
    }

    /**
     * 获取近N小时的API使用量总和
     * @param {number} hours - 小时数，默认5小时
     * @returns {Promise<number>} API使用量总和
     */
    static getRecentApiUsage(hours = 5) {
        return new Promise((resolve, reject) => {
            // 计算5小时前的时间
            const now = new Date();
            const fiveHoursAgo = new Date(now.getTime() - hours * 60 * 60 * 1000);

            // 格式化为本地时间字符串（YYYY-MM-DD HH:mm:ss）
            const year = fiveHoursAgo.getFullYear();
            const month = String(fiveHoursAgo.getMonth() + 1).padStart(2, '0');
            const day = String(fiveHoursAgo.getDate()).padStart(2, '0');
            const hoursStr = String(fiveHoursAgo.getHours()).padStart(2, '0');
            const minutes = String(fiveHoursAgo.getMinutes()).padStart(2, '0');
            const seconds = String(fiveHoursAgo.getSeconds()).padStart(2, '0');
            const timeStr = `${year}-${month}-${day} ${hoursStr}:${minutes}:${seconds}`;

            const sql = `
                SELECT SUM(api_usage) as total_usage
                FROM expense_bills
                WHERE transaction_time >= ?
            `;

            db.get(sql, [timeStr], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.total_usage || 0);
                }
            });
        });
    }

    /**
     * 获取指定时间范围内的API使用量总和
     * @param {string} startTime - 开始时间（YYYY-MM-DD HH:mm:ss）
     * @param {string} endTime - 结束时间（YYYY-MM-DD HH:mm:ss）
     * @returns {Promise<number>} API使用量总和
     */
    static getApiUsageByTimeRange(startTime, endTime) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT SUM(api_usage) as total_usage
                FROM expense_bills
                WHERE transaction_time >= ? AND transaction_time < ?
            `;

            db.get(sql, [startTime, endTime], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.total_usage || 0);
                }
            });
        });
    }

    /**
     * 获取近N小时的Token使用量总和（deduct_usage字段）
     * @param {number} hours - 小时数，默认5小时
     * @returns {Promise<number>} Token使用量总和
     */
    static getRecentDeductUsage(hours = 5) {
        return new Promise((resolve, reject) => {
            // 计算N小时前的时间
            const now = new Date();
            const hoursAgo = new Date(now.getTime() - hours * 60 * 60 * 1000);

            // 格式化为本地时间字符串（YYYY-MM-DD HH:mm:ss）
            const year = hoursAgo.getFullYear();
            const month = String(hoursAgo.getMonth() + 1).padStart(2, '0');
            const day = String(hoursAgo.getDate()).padStart(2, '0');
            const hoursStr = String(hoursAgo.getHours()).padStart(2, '0');
            const minutes = String(hoursAgo.getMinutes()).padStart(2, '0');
            const seconds = String(hoursAgo.getSeconds()).padStart(2, '0');
            const timeStr = `${year}-${month}-${day} ${hoursStr}:${minutes}:${seconds}`;

            const sql = `
                SELECT SUM(deduct_usage) as total_usage
                FROM expense_bills
                WHERE transaction_time >= ?
            `;

            db.get(sql, [timeStr], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.total_usage || 0);
                }
            });
        });
    }

    /**
     * 获取指定时间范围内的Token使用量总和（deduct_usage字段）
     * @param {string} startTime - 开始时间（YYYY-MM-DD HH:mm:ss）
     * @param {string} endTime - 结束时间（YYYY-MM-DD HH:mm:ss）
     * @returns {Promise<number>} Token使用量总和
     */
    static getDeductUsageByTimeRange(startTime, endTime) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT SUM(deduct_usage) as total_usage
                FROM expense_bills
                WHERE transaction_time >= ? AND transaction_time < ?
            `;

            db.get(sql, [startTime, endTime], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.total_usage || 0);
                }
            });
        });
    }

    /**
     * 计算Token使用量的小时级环比增长率
     * @returns {Promise<number>} 环比增长率（百分比，保留1位小数）
     */
    static getDeductUsageHourlyGrowthRate() {
        return new Promise(async (resolve, reject) => {
            try {
                const now = new Date();

                // 获取当前小时的开始时间（整点）
                const currentHourStart = new Date(now);
                currentHourStart.setMinutes(0, 0, 0); // 设置为XX:00:00

                // 获取前一小时的开始和结束时间
                const previousHourStart = new Date(currentHourStart.getTime() - 60 * 60 * 1000);
                const previousHourEnd = new Date(currentHourStart.getTime() - 1); // 当前小时开始前1毫秒

                // 格式化为本地时间字符串（YYYY-MM-DD HH:mm:ss）
                const formatTime = (date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');
                    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                };

                const currentHourStartStr = formatTime(currentHourStart);
                const previousHourStartStr = formatTime(previousHourStart);
                const previousHourEndStr = formatTime(previousHourEnd);

                // 获取当前小时的Token使用量（从当前小时开始到当前时间）
                const currentHourUsage = await this.getDeductUsageByTimeRange(currentHourStartStr, formatTime(now));

                // 获取前一小时的Token使用量（前1小时整点的完整1小时）
                const previousHourUsage = await this.getDeductUsageByTimeRange(previousHourStartStr, previousHourEndStr);

                // 计算环比增长率
                let growthRate = 0;
                if (previousHourUsage > 0) {
                    growthRate = ((currentHourUsage - previousHourUsage) / previousHourUsage) * 100;
                } else if (currentHourUsage > 0) {
                    // 如果前一时段为0但当前时段有数据，视为100%增长
                    growthRate = 100;
                }

                // 保留1位小数
                resolve(Math.round(growthRate * 10) / 10);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 获取近N小时的总花费金额
     * 计算公式：SUM(cost_price/1000 * deduct_usage)
     * @param {number} hours - 小时数，默认5小时
     * @returns {Promise<number>} 总花费金额（元）
     */
    static getRecentTotalCost(hours = 5) {
        return new Promise((resolve, reject) => {
            // 计算N小时前的时间
            const now = new Date();
            const hoursAgo = new Date(now.getTime() - hours * 60 * 60 * 1000);

            // 格式化为本地时间字符串（YYYY-MM-DD HH:mm:ss）
            const year = hoursAgo.getFullYear();
            const month = String(hoursAgo.getMonth() + 1).padStart(2, '0');
            const day = String(hoursAgo.getDate()).padStart(2, '0');
            const hoursStr = String(hoursAgo.getHours()).padStart(2, '0');
            const minutes = String(hoursAgo.getMinutes()).padStart(2, '0');
            const seconds = String(hoursAgo.getSeconds()).padStart(2, '0');
            const timeStr = `${year}-${month}-${day} ${hoursStr}:${minutes}:${seconds}`;

            const sql = `
                SELECT SUM(cost_price / 1000 * deduct_usage) as total_cost
                FROM expense_bills
                WHERE transaction_time >= ?
            `;

            db.get(sql, [timeStr], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.total_cost || 0);
                }
            });
        });
    }

    /**
     * 获取指定时间范围内的总花费金额
     * 计算公式：SUM(cost_price/1000 * deduct_usage)
     * @param {string} startTime - 开始时间（YYYY-MM-DD HH:mm:ss）
     * @param {string} endTime - 结束时间（YYYY-MM-DD HH:mm:ss）
     * @returns {Promise<number>} 总花费金额（元）
     */
    static getTotalCostByTimeRange(startTime, endTime) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT SUM(cost_price / 1000 * deduct_usage) as total_cost
                FROM expense_bills
                WHERE transaction_time >= ? AND transaction_time < ?
            `;

            db.get(sql, [startTime, endTime], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.total_cost || 0);
                }
            });
        });
    }

    /**
     * 计算总花费金额的小时级环比增长率
     * @returns {Promise<number>} 环比增长率（百分比，保留1位小数）
     */
    static getTotalCostHourlyGrowthRate() {
        return new Promise(async (resolve, reject) => {
            try {
                const now = new Date();

                // 获取当前小时的开始时间（整点）
                const currentHourStart = new Date(now);
                currentHourStart.setMinutes(0, 0, 0); // 设置为XX:00:00

                // 获取前一小时的开始和结束时间
                const previousHourStart = new Date(currentHourStart.getTime() - 60 * 60 * 1000);
                const previousHourEnd = new Date(currentHourStart.getTime() - 1); // 当前小时开始前1毫秒

                // 格式化为本地时间字符串（YYYY-MM-DD HH:mm:ss）
                const formatTime = (date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');
                    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                };

                const currentHourStartStr = formatTime(currentHourStart);
                const previousHourStartStr = formatTime(previousHourStart);
                const previousHourEndStr = formatTime(previousHourEnd);

                // 获取当前小时的总花费（从当前小时开始到当前时间）
                const currentHourCost = await this.getTotalCostByTimeRange(currentHourStartStr, formatTime(now));

                // 获取前一小时的总花费（前1小时整点的完整1小时）
                const previousHourCost = await this.getTotalCostByTimeRange(previousHourStartStr, previousHourEndStr);

                // 计算环比增长率
                let growthRate = 0;
                if (previousHourCost > 0) {
                    growthRate = ((currentHourCost - previousHourCost) / previousHourCost) * 100;
                } else if (currentHourCost > 0) {
                    // 如果前一时段为0但当前时段有数据，视为100%增长
                    growthRate = 100;
                }

                // 保留1位小数
                resolve(Math.round(growthRate * 10) / 10);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 获取最近N小时的每小时统计数据
     * @param {number} hours - 小时数，默认5小时
     * @returns {Promise<{labels: string[], callCountData: number[], tokenData: number[]}>} 按小时统计的数据
     */
    static getHourlyUsage(hours = 5) {
        return new Promise((resolve, reject) => {
            const now = new Date();
            const labels = [];
            const callCountData = [];
            const tokenData = [];

            // 生成最近N小时的时间标签（每小时的开始时间）
            for (let i = hours - 1; i >= 0; i--) {
                const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
                // 设置为整点（去掉分钟和秒）
                hourStart.setMinutes(0, 0, 0);

                const year = hourStart.getFullYear();
                const month = String(hourStart.getMonth() + 1).padStart(2, '0');
                const day = String(hourStart.getDate()).padStart(2, '0');
                const hour = String(hourStart.getHours()).padStart(2, '0');
                const timeLabel = `${month}-${day} ${hour}:00`;
                labels.push(timeLabel);
            }

            // 查询数据库，获取每小时的统计数据
            const firstHourStart = new Date(now.getTime() - (hours - 1) * 60 * 60 * 1000);
            firstHourStart.setMinutes(0, 0, 0);

            const firstHourLabel = `${firstHourStart.getFullYear()}-${String(firstHourStart.getMonth() + 1).padStart(2, '0')}-${String(firstHourStart.getDate()).padStart(2, '0')} ${String(firstHourStart.getHours()).padStart(2, '0')}:00:00`;
            const nowLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

            const sql = `
                SELECT
                    DATE(transaction_time) as date,
                    strftime('%H', transaction_time) as hour,
                    SUM(api_usage) as total_api_usage,
                    SUM(deduct_usage) as total_token_usage
                FROM expense_bills
                WHERE transaction_time >= ? AND transaction_time <= ?
                GROUP BY DATE(transaction_time), strftime('%H', transaction_time)
                ORDER BY DATE(transaction_time), strftime('%H', transaction_time)
            `;

            db.all(sql, [firstHourLabel, nowLabel], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                // 初始化数据为0
                for (let i = 0; i < hours; i++) {
                    callCountData.push(0);
                    tokenData.push(0);
                }

                // 将查询结果填入对应的数组位置
                rows.forEach(row => {
                    const rowDateTime = new Date(row.date + ' ' + row.hour + ':00:00');

                    // 计算这个时间戳应该放在数组的哪个位置
                    // 从最早的小时开始算起
                    const index = hours - 1 - Math.floor((now - rowDateTime) / (60 * 60 * 1000));

                    if (index >= 0 && index < hours) {
                        callCountData[index] = Math.round(row.total_api_usage || 0);
                        tokenData[index] = Math.round(row.total_token_usage || 0);
                    }
                });

                resolve({
                    labels,
                    callCountData,
                    tokenData
                });
            });
        });
    }

    /**
     * 获取最近N天的每天统计数据
     * @param {number} days - 天数，默认7天
     * @returns {Promise<{labels: string[], callCountData: number[], tokenData: number[]}>} 按天统计的数据
     */
    static getDailyUsage(days = 7) {
        return new Promise((resolve, reject) => {
            const now = new Date();
            const labels = [];
            const callCountData = [];
            const tokenData = [];

            // 生成最近N天的时间标签（每天的开始时间）
            for (let i = days - 1; i >= 0; i--) {
                const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                // 设置为凌晨（去掉小时、分钟和秒）
                dayStart.setHours(0, 0, 0, 0);

                const year = dayStart.getFullYear();
                const month = String(dayStart.getMonth() + 1).padStart(2, '0');
                const day = String(dayStart.getDate()).padStart(2, '0');
                const timeLabel = `${month}-${day}`;
                labels.push(timeLabel);
            }

            // 查询数据库，获取每天的统计数据
            const firstDayStart = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
            firstDayStart.setHours(0, 0, 0, 0);

            const firstDayLabel = `${firstDayStart.getFullYear()}-${String(firstDayStart.getMonth() + 1).padStart(2, '0')}-${String(firstDayStart.getDate()).padStart(2, '0')} 00:00:00`;
            const nowLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

            const sql = `
                SELECT
                    DATE(transaction_time) as date,
                    SUM(api_usage) as total_api_usage,
                    SUM(deduct_usage) as total_token_usage
                FROM expense_bills
                WHERE transaction_time >= ? AND transaction_time <= ?
                GROUP BY DATE(transaction_time)
                ORDER BY DATE(transaction_time)
            `;

            db.all(sql, [firstDayLabel, nowLabel], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                // 初始化数据为0
                for (let i = 0; i < days; i++) {
                    callCountData.push(0);
                    tokenData.push(0);
                }

                // 将查询结果填入对应的数组位置
                rows.forEach(row => {
                    const rowDateTime = new Date(row.date);

                    // 计算这个日期应该放在数组的哪个位置
                    // 从最早的天开始算起
                    const index = days - 1 - Math.floor((now - rowDateTime) / (24 * 60 * 60 * 1000));

                    if (index >= 0 && index < days) {
                        callCountData[index] = Math.round(row.total_api_usage || 0);
                        tokenData[index] = Math.round(row.total_token_usage || 0);
                    }
                });

                resolve({
                    labels,
                    callCountData,
                    tokenData
                });
            });
        });
    }

    /**
     * 计算小时级环比增长率
     * @returns {Promise<number>} 环比增长率（百分比，保留1位小数）
     */
    static getHourlyGrowthRate() {
        return new Promise(async (resolve, reject) => {
            try {
                const now = new Date();

                // 获取当前小时的开始时间（整点）
                const currentHourStart = new Date(now);
                currentHourStart.setMinutes(0, 0, 0); // 设置为XX:00:00

                // 获取前一小时的开始和结束时间
                const previousHourStart = new Date(currentHourStart.getTime() - 60 * 60 * 1000);
                const previousHourEnd = new Date(currentHourStart.getTime() - 1); // 当前小时开始前1毫秒

                // 格式化为本地时间字符串（YYYY-MM-DD HH:mm:ss）
                const formatTime = (date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');
                    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                };

                const currentHourStartStr = formatTime(currentHourStart);
                const previousHourStartStr = formatTime(previousHourStart);
                const previousHourEndStr = formatTime(previousHourEnd);

                // 获取当前小时的API使用量（从当前小时开始到当前时间）
                const currentHourUsage = await this.getApiUsageByTimeRange(currentHourStartStr, formatTime(now));

                // 获取前一小时的API使用量（前1小时整点的完整1小时）
                const previousHourUsage = await this.getApiUsageByTimeRange(previousHourStartStr, previousHourEndStr);

                // 计算环比增长率
                let growthRate = 0;
                if (previousHourUsage > 0) {
                    growthRate = ((currentHourUsage - previousHourUsage) / previousHourUsage) * 100;
                } else if (currentHourUsage > 0) {
                    // 如果前一时段为0但当前时段有数据，视为100%增长
                    growthRate = 100;
                }

                // 保留1位小数
                resolve(Math.round(growthRate * 10) / 10);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 获取近5小时产品分布统计（按model_product_name分组，统计sum(api_usage)）
     * @returns {Promise<Array>} 产品分布数据 [{productName: string, totalUsage: number}]
     */
    static getProductDistribution() {
        return new Promise((resolve, reject) => {
            const now = new Date();
            const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);

            // 格式化为本地时间字符串（YYYY-MM-DD HH:mm:ss）
            const year = fiveHoursAgo.getFullYear();
            const month = String(fiveHoursAgo.getMonth() + 1).padStart(2, '0');
            const day = String(fiveHoursAgo.getDate()).padStart(2, '0');
            const hoursStr = String(fiveHoursAgo.getHours()).padStart(2, '0');
            const minutes = String(fiveHoursAgo.getMinutes()).padStart(2, '0');
            const seconds = String(fiveHoursAgo.getSeconds()).padStart(2, '0');
            const timeStr = `${year}-${month}-${day} ${hoursStr}:${minutes}:${seconds}`;

            const sql = `
                SELECT
                    model_product_name,
                    SUM(api_usage) as total_usage
                FROM expense_bills
                WHERE transaction_time >= ?
                AND model_product_name IS NOT NULL
                AND model_product_name != ''
                GROUP BY model_product_name
                ORDER BY total_usage DESC
            `;

            db.all(sql, [timeStr], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const result = rows.map(row => ({
                        productName: row.model_product_name,
                        totalUsage: Math.round(row.total_usage || 0)
                    }));
                    resolve(result);
                }
            });
        });
    }

    /**
     * 获取指定时间范围内的产品分布统计（按model_product_name分组，统计sum(api_usage)）
     * @param {string} startTime - 开始时间（YYYY-MM-DD HH:mm:ss）
     * @param {string} endTime - 结束时间（YYYY-MM-DD HH:mm:ss）
     * @returns {Promise<Array>} 产品分布数据 [{productName: string, totalUsage: number}]
     */
    static getProductDistributionByTimeRange(startTime, endTime) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    model_product_name,
                    SUM(api_usage) as total_usage
                FROM expense_bills
                WHERE transaction_time >= ? AND transaction_time < ?
                AND model_product_name IS NOT NULL
                AND model_product_name != ''
                GROUP BY model_product_name
                ORDER BY total_usage DESC
            `;

            db.all(sql, [startTime, endTime], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const result = rows.map(row => ({
                        productName: row.model_product_name,
                        totalUsage: Math.round(row.total_usage || 0)
                    }));
                    resolve(result);
                }
            });
        });
    }

    /**
     * 获取近N小时产品分布统计
     * @param {number} hours - 小时数，默认5小时
     * @returns {Promise<Array>} 产品分布数据 [{productName: string, totalUsage: number}]
     */
    static getProductDistributionByHours(hours = 5) {
        return new Promise((resolve, reject) => {
            const now = new Date();
            const hoursAgo = new Date(now.getTime() - hours * 60 * 60 * 1000);

            // 格式化为本地时间字符串（YYYY-MM-DD HH:mm:ss）
            const year = hoursAgo.getFullYear();
            const month = String(hoursAgo.getMonth() + 1).padStart(2, '0');
            const day = String(hoursAgo.getDate()).padStart(2, '0');
            const hoursStr = String(hoursAgo.getHours()).padStart(2, '0');
            const minutes = String(hoursAgo.getMinutes()).padStart(2, '0');
            const seconds = String(hoursAgo.getSeconds()).padStart(2, '0');
            const timeStr = `${year}-${month}-${day} ${hoursStr}:${minutes}:${seconds}`;

            const sql = `
                SELECT
                    model_product_name,
                    SUM(api_usage) as total_usage
                FROM expense_bills
                WHERE transaction_time >= ?
                AND model_product_name IS NOT NULL
                AND model_product_name != ''
                GROUP BY model_product_name
                ORDER BY total_usage DESC
            `;

            db.all(sql, [timeStr], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const result = rows.map(row => ({
                        productName: row.model_product_name,
                        totalUsage: Math.round(row.total_usage || 0)
                    }));
                    resolve(result);
                }
            });
        });
    }
}
module.exports = Bill;

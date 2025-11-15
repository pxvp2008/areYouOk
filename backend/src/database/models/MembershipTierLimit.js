// 会员等级调用次数限制模型
const db = require('../connection');

class MembershipTierLimit {
    /**
     * 根据会员等级名称获取调用次数限制
     * @param {string} tierName - 会员等级名称
     * @returns {Promise<Object>} 包含call_limit和period_hours的对象
     */
    static getLimitByTierName(tierName) {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT call_limit, period_hours FROM membership_tier_limits WHERE tier_name = ?',
                [tierName],
                (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    if (!row) {
                        // 如果没有找到，返回默认值（GLM Coding Pro）
                        resolve({
                            call_limit: 600,
                            period_hours: 5
                        });
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    /**
     * 智能匹配会员等级名称
     * @param {string} tokenResourceName - 资源名称（如："GLM Coding Lite - 包季计划"）
     * @returns {Promise<Object>} 包含call_limit和period_hours的对象
     */
    static getLimitByTokenResourceName(tokenResourceName) {
        return new Promise((resolve, reject) => {
            // 获取所有会员等级列表进行模糊匹配
            db.all(
                'SELECT tier_name, call_limit, period_hours FROM membership_tier_limits ORDER BY call_limit',
                [],
                (err, rows) => {
                    if (err) {
                        return reject(err);
                    }

                    // 尝试精确匹配
                    for (const row of rows) {
                        if (tokenResourceName === row.tier_name) {
                            resolve(row);
                            return;
                        }
                    }

                    // 尝试部分匹配（包含关系）
                    for (const row of rows) {
                        if (tokenResourceName.includes(row.tier_name)) {
                            resolve(row);
                            return;
                        }
                    }

                    // 如果没有找到，返回默认值（GLM Coding Pro）
                    const defaultTier = rows.find(r => r.tier_name === 'GLM Coding Pro') || rows[0];
                    resolve(defaultTier ? {
                        call_limit: defaultTier.call_limit,
                        period_hours: defaultTier.period_hours
                    } : {
                        call_limit: 10,
                        period_hours: 5
                    });
                }
            );
        });
    }

    /**
     * 获取所有会员等级限制
     * @returns {Promise<Array>} 所有会员等级限制列表
     */
    static getAllLimits() {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT tier_name, call_limit, period_hours FROM membership_tier_limits ORDER BY call_limit',
                [],
                (err, rows) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(rows);
                }
            );
        });
    }
}

module.exports = MembershipTierLimit;

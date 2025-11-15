// 同步历史日志数据模型
const db = require('../connection');

class SyncHistory {
    /**
     * 创建同步历史记录
     * @param {Object} historyData - 同步历史数据
     * @returns {Promise}
     */
    static create(historyData) {
        return new Promise((resolve, reject) => {
            const {
                sync_type,
                billing_month,
                status,
                synced_count = 0,
                failed_count = 0,
                total_count = 0,
                message = '',
                duration = 0
            } = historyData;

            const sql = `
                INSERT INTO sync_history (
                    sync_type, billing_month, status,
                    synced_count, failed_count, total_count,
                    message, duration
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                sync_type, billing_month, status,
                synced_count, failed_count, total_count,
                message, duration
            ];

            db.run(sql, params, function(err) {
                if (err) {
                    console.error('创建同步历史记录失败:', err.message);
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        sync_type,
                        billing_month,
                        status,
                        synced_count,
                        failed_count,
                        total_count,
                        message,
                        duration
                    });
                }
            });
        });
    }

    /**
     * 获取指定类型的同步历史记录
     * @param {string} syncType - 同步类型 ('incremental' 或 'full')
     * @param {number} limit - 限制返回记录数
     * @returns {Promise<Array>}
     */
    static findByType(syncType, limit = 10) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT *
                FROM sync_history
                WHERE sync_type = ?
                ORDER BY sync_time DESC
                LIMIT ?
            `;

            db.all(sql, [syncType, limit], (err, rows) => {
                if (err) {
                    console.error('获取同步历史记录失败:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * 获取指定类型的同步历史记录（分页版本）
     * @param {string} syncType - 同步类型 ('incremental' 或 'full')
     * @param {number} limit - 限制返回记录数
     * @param {number} offset - 偏移量
     * @returns {Promise<{data: Array, total: number}>}
     */
    static findByTypePaginated(syncType, limit = 10, offset = 0) {
        return new Promise((resolve, reject) => {
            // 先获取总条数
            const countSql = `
                SELECT COUNT(*) as total
                FROM sync_history
                WHERE sync_type = ?
            `;

            db.get(countSql, [syncType], (err, countResult) => {
                if (err) {
                    console.error('获取总条数失败:', err.message);
                    reject(err);
                    return;
                }

                // 再获取分页数据
                const dataSql = `
                    SELECT *
                    FROM sync_history
                    WHERE sync_type = ?
                    ORDER BY sync_time DESC
                    LIMIT ? OFFSET ?
                `;

                db.all(dataSql, [syncType, limit, offset], (err, rows) => {
                    if (err) {
                        console.error('获取同步历史记录失败:', err.message);
                        reject(err);
                    } else {
                        resolve({
                            data: rows,
                            total: countResult.total
                        });
                    }
                });
            });
        });
    }

    /**
     * 获取所有同步历史记录
     * @param {number} limit - 限制返回记录数
     * @returns {Promise<Array>}
     */
    static findAll(limit = 50) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT *
                FROM sync_history
                ORDER BY sync_time DESC
                LIMIT ?
            `;

            db.all(sql, [limit], (err, rows) => {
                if (err) {
                    console.error('获取同步历史记录失败:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * 清理旧记录
     * @param {number} days - 保留天数
     * @returns {Promise<{count: number}>}
     */
    static cleanOldRecords(days = 30) {
        return new Promise((resolve, reject) => {
            const sql = `
                DELETE FROM sync_history
                WHERE sync_time < datetime('now', '-' || ? || ' days')
            `;

            db.run(sql, [days], function(err) {
                if (err) {
                    console.error('清理旧记录失败:', err.message);
                    reject(err);
                } else {
                    resolve({ count: this.changes });
                }
            });
        });
    }
}

module.exports = SyncHistory;

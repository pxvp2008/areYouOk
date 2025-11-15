// 自动同步配置模型
const db = require('../connection');

class AutoSyncConfig {
    // 获取自动同步配置
    static get() {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM auto_sync_config ORDER BY id DESC LIMIT 1',
                (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    // 如果没有配置，返回默认配置
                    if (!row) {
                        resolve({
                            enabled: 0,
                            frequency_seconds: 10,
                            next_sync_time: null,
                            last_sync_time: null
                        });
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    // 保存或更新自动同步配置
    static async save(config) {
        const { enabled, frequency_seconds } = config;
        return new Promise((resolve, reject) => {
            // 先删除旧配置
            db.run('DELETE FROM auto_sync_config', (err) => {
                if (err) {
                    return reject(err);
                }

                // 插入新配置
                db.run(
                    'INSERT INTO auto_sync_config (enabled, frequency_seconds, created_at, updated_at) VALUES (?, ?, datetime(CURRENT_TIMESTAMP, "localtime"), datetime(CURRENT_TIMESTAMP, "localtime"))',
                    [enabled ? 1 : 0, frequency_seconds],
                    function(err) {
                        if (err) {
                            return reject(err);
                        }
                        resolve({
                            id: this.lastID,
                            enabled: enabled ? 1 : 0,
                            frequency_seconds
                        });
                    }
                );
            });
        });
    }

    // 更新下次同步时间
    static updateNextSyncTime(id, nextSyncTime) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE auto_sync_config SET next_sync_time = ?, updated_at = datetime(CURRENT_TIMESTAMP, "localtime") WHERE id = ?',
                [nextSyncTime, id],
                function(err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve({ changes: this.changes });
                }
            );
        });
    }

    // 更新最后同步时间
    static updateLastSyncTime(id) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE auto_sync_config SET last_sync_time = datetime(CURRENT_TIMESTAMP, "localtime"), next_sync_time = NULL, updated_at = datetime(CURRENT_TIMESTAMP, "localtime") WHERE id = ?',
                [id],
                function(err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve({ changes: this.changes });
                }
            );
        });
    }

    // 计算下次同步时间（使用本地时区）
    static calculateNextSyncTime(frequencySeconds) {
        const now = new Date();
        // 添加0.5秒缓冲，减少因微小延迟导致的误差
        now.setMilliseconds(now.getMilliseconds() + 500);
        now.setSeconds(now.getSeconds() + frequencySeconds);

        // 格式化为本地时间字符串（YYYY-MM-DD HH:mm:ss）
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    // 获取需要同步的配置（启用的且时间到了的）
    static getDueConfigs() {
        return new Promise((resolve, reject) => {
            // 使用本地时间（与 calculateNextSyncTime 保持一致）
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const nowStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

            db.all(
                'SELECT * FROM auto_sync_config WHERE enabled = 1 AND next_sync_time IS NOT NULL AND next_sync_time <= ?',
                [nowStr],
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

module.exports = AutoSyncConfig;

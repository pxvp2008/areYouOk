// 自动同步配置控制器
const AutoSyncConfig = require('../database/models/AutoSyncConfig');
const syncService = require('../services/syncService');

class AutoSyncController {
    /**
     * 获取自动同步配置
     * GET /api/auto-sync/config
     */
    async getConfig(req, res) {
        try {
            const config = await AutoSyncConfig.get();

            res.json({
                success: true,
                data: {
                    ...config,
                    enabled: !!config.enabled,
                    // 计算下次同步倒计时（秒）
                    countdown: config.next_sync_time
                        ? Math.max(0, Math.floor((new Date(config.next_sync_time) - new Date()) / 1000))
                        : null
                }
            });
        } catch (error) {
            console.error('获取自动同步配置失败:', error);
            res.status(500).json({
                success: false,
                message: '获取配置失败: ' + error.message
            });
        }
    }

    /**
     * 保存自动同步配置
     * POST /api/auto-sync/config
     * body: { enabled, frequency_seconds }
     */
    async saveConfig(req, res) {
        try {
            const { enabled, frequency_seconds } = req.body;

            // 验证参数
            if (frequency_seconds && ![5, 10, 60, 300].includes(frequency_seconds)) {
                return res.status(400).json({
                    success: false,
                    message: '频率只能是: 5s, 10s, 1min, 5min'
                });
            }

            // 获取当前配置
            const currentConfig = await AutoSyncConfig.get();

            // 计算下次同步时间
            let next_sync_time = null;
            if (enabled) {
                const frequency = frequency_seconds || currentConfig.frequency_seconds || 10;
                next_sync_time = AutoSyncConfig.calculateNextSyncTime(frequency);
            }

            // 保存配置
            const savedConfig = await AutoSyncConfig.save({
                enabled: !!enabled,
                frequency_seconds: frequency_seconds || 10
            });

            // 如果启用了自动同步，更新下次同步时间
            if (enabled) {
                await AutoSyncConfig.updateNextSyncTime(savedConfig.id, next_sync_time);
            }

            res.json({
                success: true,
                message: '配置保存成功',
                data: {
                    ...savedConfig,
                    enabled: !!savedConfig.enabled,
                    next_sync_time: enabled ? next_sync_time : null
                }
            });

        } catch (error) {
            console.error('保存自动同步配置失败:', error);
            res.status(500).json({
                success: false,
                message: '保存配置失败: ' + error.message
            });
        }
    }

    /**
     * 立即触发一次自动同步
     * POST /api/auto-sync/trigger
     * 自动同步当前月份的账单数据
     */
    async triggerSync(req, res) {
        try {
            const config = await AutoSyncConfig.get();

            if (!config.enabled) {
                return res.status(400).json({
                    success: false,
                    message: '自动同步未启用'
                });
            }

            // 获取当前月份（YYYY-MM格式）
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // 触发增量同步（同步当前月份）
            const result = await syncService.incrementalSync(currentMonth);

            // 更新最后同步时间
            if (config.id) {
                await AutoSyncConfig.updateLastSyncTime(config.id);
            }

            // 计算下次同步时间
            const nextSyncTime = AutoSyncConfig.calculateNextSyncTime(config.frequency_seconds);
            if (config.id) {
                await AutoSyncConfig.updateNextSyncTime(config.id, nextSyncTime);
            }

            res.json({
                success: true,
                message: '自动同步触发成功',
                data: {
                    ...result,
                    billing_month: currentMonth,
                    next_sync_time: nextSyncTime
                }
            });

        } catch (error) {
            console.error('触发自动同步失败:', error);
            res.status(500).json({
                success: false,
                message: '触发同步失败: ' + error.message
            });
        }
    }

    /**
     * 停止自动同步
     * POST /api/auto-sync/stop
     */
    async stopSync(req, res) {
        try {
            const config = await AutoSyncConfig.get();

            if (config.id) {
                // 禁用自动同步
                await AutoSyncConfig.save({
                    enabled: false,
                    frequency_seconds: config.frequency_seconds
                });
            }

            res.json({
                success: true,
                message: '自动同步已停止',
                data: {
                    enabled: false
                }
            });

        } catch (error) {
            console.error('停止自动同步失败:', error);
            res.status(500).json({
                success: false,
                message: '停止同步失败: ' + error.message
            });
        }
    }
}

module.exports = new AutoSyncController();

/**
 * 自动同步服务
 * 负责定时检查和触发自动同步
 * 遵循核心开发原则：KISS、单一职责、异常处理
 */

const AutoSyncConfig = require('../database/models/AutoSyncConfig');
const syncService = require('./syncService');

class AutoSyncService {
    constructor() {
        this.intervalId = null;          // 定时任务ID
        this.isRunning = false;          // 是否正在运行
        this.isProcessing = false;       // 是否正在处理同步（防止并发）
        this.checkInterval = 1000;       // 检查间隔：1秒（更精确，符合配置频率）
    }

    /**
     * 启动自动同步服务
     * @param {number} interval - 检查间隔（毫秒），默认1秒
     */
    start(interval = 1000) {
        if (this.isRunning) {
            console.log('自动同步服务已在运行');
            return;
        }

        this.checkInterval = interval;
        this.isRunning = true;

        console.log(`自动同步服务已启动，检查间隔: ${interval / 1000}秒`);

        // 启动定时检查
        this.intervalId = setInterval(() => {
            this.checkAndTriggerSync();
        }, this.checkInterval);
    }

    /**
     * 停止自动同步服务
     */
    stop() {
        if (!this.isRunning) {
            console.log('自动同步服务未运行');
            return;
        }

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        this.isProcessing = false;

        console.log('自动同步服务已停止');
    }

    /**
     * 检查并触发同步
     * 单例模式：避免并发处理
     */
    async checkAndTriggerSync() {
        // 如果正在处理中，跳过本次检查
        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;

            // 获取所有需要同步的配置
            const dueConfigs = await AutoSyncConfig.getDueConfigs();

            if (dueConfigs.length === 0) {
                this.isProcessing = false;
                return;
            }

            console.log(`\n发现 ${dueConfigs.length} 个配置需要同步`);

            // 逐个处理（串行处理，避免并发）
            for (const config of dueConfigs) {
                await this.processSync(config);
            }

        } catch (error) {
            console.error('自动同步检查失败:', error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 处理单个同步任务
     * @param {Object} config - 同步配置
     */
    async processSync(config) {
        const startTime = Date.now();  // 记录开始时间

        try {
            console.log(`\n开始自动同步 (配置ID: ${config.id})`);

            // 获取当前月份
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // 触发增量同步（历史记录保存由 syncService 处理）
            const result = await syncService.incrementalSync(currentMonth);

            // 记录结果
            console.log(`自动同步完成:`, {
                synced: result.synced || 0,
                failed: result.failed || 0,
                total: result.total || 0
            });

            // 更新最后同步时间
            if (config.id) {
                await AutoSyncConfig.updateLastSyncTime(config.id);
            }

            // 计算并更新下次同步时间
            const nextSyncTime = AutoSyncConfig.calculateNextSyncTime(config.frequency_seconds);
            if (config.id) {
                await AutoSyncConfig.updateNextSyncTime(config.id, nextSyncTime);
                console.log(`下次同步时间: ${nextSyncTime}`);
            }

        } catch (err) {
            console.error(`自动同步失败 (配置ID: ${config.id}):`, err.message);

            // 更新最后同步时间（即使失败）
            if (config.id) {
                try {
                    await AutoSyncConfig.updateLastSyncTime(config.id);
                } catch (updateError) {
                    console.error('更新最后同步时间失败:', updateError.message);
                }
            }
        }
    }

    /**
     * 获取服务状态
     * @returns {Object}
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isProcessing: this.isProcessing,
            checkInterval: this.checkInterval
        };
    }
}

// 单例模式
const autoSyncService = new AutoSyncService();

module.exports = autoSyncService;

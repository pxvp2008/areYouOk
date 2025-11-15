// 数据同步服务
// 全量/增量同步账单数据到本地数据库
const apiService = require('./apiService');
const Bill = require('../database/models/Bill');
const SyncHistory = require('../database/models/SyncHistory');
const { transformBillData, extractTransactionTime } = require('../utils/dataTransform');
class SyncService {
    constructor() {
        this.syncing = false;
        this.progress = {
            percentage: 0,
            current: 0,
            total: 0,
            stage: 'idle'
        };
        this.syncResult = null;
    }

    /**
     * 验证同步参数
     * @param {string} billingMonth - 账单月份 (YYYY-MM)
     * @returns {boolean} 验证结果
     */
    validateSyncParams(billingMonth) {
        if (!billingMonth) {
            throw new Error('账单月份不能为空');
        }
        // 验证账单月份格式 (YYYY-MM)
        const monthRegex = /^\d{4}-\d{2}$/;
        if (!monthRegex.test(billingMonth)) {
            throw new Error('账单月份格式不正确，应为 YYYY-MM');
        }
        return true;
    }

    /**
     * 初始化同步状态
     * @param {string} stage - 同步阶段
     * @returns {number} 开始时间戳
     */
    initializeSync(stage) {
        if (this.syncing) {
            throw new Error('数据同步正在进行中，请稍后再试');
        }
        this.syncing = true;
        this.progress = {
            percentage: 0,
            current: 0,
            total: 0,
            stage
        };
        return Date.now();
    }

    /**
     * 清空数据库表
     * @returns {Promise<Object>} 删除结果
     */
    async clearDatabase() {
        this.progress.stage = 'clearing';
        const deleteResult = await Bill.deleteAll();
        this.progress.percentage = 5;
        this.progress.current = deleteResult.count;
        return deleteResult;
    }

    /**
     * 从API获取数据
     * @param {string} billingMonth - 账单月份
     * @returns {Promise<Array>} API账单数据
     */
    async fetchApiData(billingMonth) {
        this.progress.stage = 'fetching';
        // 使用pageSize=100以匹配智谱AI控制台的分页设置
        const apiBills = await apiService.fetchAllBills(billingMonth, 100);
        this.progress.total = apiBills.length;
        this.progress.percentage = 10;
        return apiBills;
    }

    /**
     * 验证API数据
     * @param {Array} apiBills - API账单数据
     * @returns {Object} 验证结果
     */
    validateApiData(apiBills) {
        // 检查apiBills中是否有billingNo重复的数据
        const apiBillNoSet = new Set();
        const duplicateApiBillNos = [];

        for (const bill of apiBills) {
            if (bill.billingNo) {
                if (apiBillNoSet.has(bill.billingNo)) {
                    duplicateApiBillNos.push(bill.billingNo);
                }
                apiBillNoSet.add(bill.billingNo);
            }
        }

        return {
            hasDuplicates: duplicateApiBillNos.length > 0,
            duplicateBillNos: duplicateApiBillNos,
            isEmpty: apiBills.length === 0
        };
    }

    /**
     * 转换数据格式
     * @param {Array} apiBills - API账单数据
     * @returns {Object} 转换结果
     */
    transformData(apiBills) {
        const transformedBills = apiBills.map(bill => transformBillData(bill));

        // 检查transformedBills中是否有billing_no重复的数据
        const transformedBillNoSet = new Set();
        const duplicateTransformedBillNos = [];

        for (const bill of transformedBills) {
            if (bill.billing_no) {
                if (transformedBillNoSet.has(bill.billing_no)) {
                    duplicateTransformedBillNos.push(bill.billing_no);
                }
                transformedBillNoSet.add(bill.billing_no);
            }
        }

        return {
            transformedBills,
            hasDuplicates: duplicateTransformedBillNos.length > 0,
            duplicateBillNos: duplicateTransformedBillNos
        };
    }

    /**
     * 保存数据到数据库
     * @param {Array} transformedBills - 转换后的账单数据
     * @returns {Promise<Object>} 保存结果
     */
    async saveToDatabase(transformedBills) {
        this.progress.stage = 'saving';
        let synced = 0;
        let failed = 0;
        const errors = [];

        for (let i = 0; i < transformedBills.length; i++) {
            const billData = transformedBills[i];
            try {
                const result = await Bill.create(billData);
                // 所有成功执行的记录都计入已处理（无论是插入还是更新）
                synced++;
                if (result.changes === 0) {
                    // 记录未变更的情况，但不影响同步成功状态
                }
            } catch (error) {
                failed++;
                const errorMsg = `账单 ${billData.billing_no || 'unknown'} 同步失败: ${error.message}`;
                console.error(errorMsg, { error: error.code });
                errors.push(errorMsg);
            }
            // 更新进度 (从10%到95%)
            this.progress.current = i + 1;
            this.progress.percentage = 10 + Math.floor((i + 1) / transformedBills.length * 85);
        }

        return {
            synced,
            failed,
            errors: errors.slice(0, 10) // 只返回前10个错误
        };
    }

    /**
     * 保存同步历史记录
     * @param {Object} historyData - 历史记录数据
     */
    async saveSyncHistory(historyData) {
        try {
            await SyncHistory.create(historyData);
        } catch (historyError) {
            console.error('保存同步历史记录失败:', historyError.message);
        }
    }

    /**
     * 同步指定月份的账单数据
     * @param {string} billingMonth - 账单月份 (YYYY-MM)
     * @returns {Promise<Object>} 同步结果
     */
    async syncBills(billingMonth) {
        // 1. 验证参数
        this.validateSyncParams(billingMonth);

        // 2. 初始化同步状态
        const startTime = this.initializeSync('clearing');

        try {
            // 3. 清空数据库
            await this.clearDatabase();

            // 4. 获取API数据
            const apiBills = await this.fetchApiData(billingMonth);

            // 5. 处理无数据的情况
            if (apiBills.length === 0) {
                this.progress.stage = 'completed';
                this.progress.percentage = 100;
                const duration = Date.now() - startTime;
                const result = {
                    success: true,
                    message: '没有找到数据',
                    synced: 0,
                    failed: 0,
                    duration
                };

                await this.saveSyncHistory({
                    sync_type: 'full',
                    billing_month: billingMonth,
                    status: '成功',
                    synced_count: 0,
                    failed_count: 0,
                    total_count: 0,
                    message: '没有找到数据',
                    duration: Math.floor(duration / 1000)
                });

                return result;
            }

            // 6. 验证API数据
            this.validateApiData(apiBills);

            // 7. 转换数据格式
            const { transformedBills } = this.transformData(apiBills);

            // 8. 保存到数据库
            const { synced, failed, errors } = await this.saveToDatabase(transformedBills);

            // 9. 完成同步
            this.progress.stage = 'completed';
            this.progress.percentage = 100;
            const duration = Date.now() - startTime;
            const result = {
                success: true,
                total: apiBills.length,
                synced,
                failed,
                duration,
                errors
            };

            // 10. 保存成功历史记录
            await this.saveSyncHistory({
                sync_type: 'full',
                billing_month: billingMonth,
                status: '成功',
                synced_count: synced,
                failed_count: failed,
                total_count: apiBills.length,
                message: '全量数据同步完成',
                duration: Math.floor(duration / 1000)
            });

            return result;
        } catch (error) {
            console.error('数据同步失败:', error.message);

            // 保存失败历史记录
            await this.saveSyncHistory({
                sync_type: 'full',
                billing_month: billingMonth,
                status: '失败',
                synced_count: 0,
                failed_count: 0,
                total_count: 0,
                message: error.message || '全量数据同步失败',
                duration: 0
            });

            throw error;
        } finally {
            this.syncing = false;
        }
    }
    /**
     * 增量同步（只同步最新的数据）
     * 采用分页查询方式，减少API调用压力
     * @param {string} billingMonth - 账单月份
     * @returns {Promise<Object>} 同步结果
     */
    async incrementalSync(billingMonth) {
        if (this.syncing) {
            throw new Error('数据同步正在进行中，请稍后再试');
        }
        this.syncing = true;
        const startTime = Date.now();
        try {
            // 1. 获取数据库中最新的一条记录的transaction_time
            const tdblatest = await Bill.getLatestTransactionTime();
            // 2. 分页查询API数据，发现存量数据即停止
            const allIncrementalBills = [];
            let totalApiBills = 0;
            let skipped = 0;
            let stopIncremental = false;
            let currentPage = 1;
            const pageSize = apiService.defaultPageSize; // 使用apiService的配置
            if (!tdblatest) {
                // 如果数据库无记录，提示用户先进行全量同步
                throw new Error('增量同步需要在已有数据的基础上进行，请先进行全量数据同步');
            }
            // 循环分页查询，直到发现存量数据或没有更多数据
            while (!stopIncremental) {
                // 调用API获取单页数据
                const response = await apiService.fetchBills(billingMonth, currentPage, pageSize);
                const apiBills = response.rows || [];
                totalApiBills += apiBills.length;
                if (apiBills.length === 0) {
                    break;
                }
                // 检查当前页数据
                let hasOldData = false;
                for (const bill of apiBills) {
                    // 使用共享的 extractTransactionTime 函数解析时间戳
                    const parsedTime = extractTransactionTime(bill);
                    if (!parsedTime) {
                        // 无法解析时间戳的数据跳过
                        skipped++;
                        continue;
                    }
                    // 一旦发现tapilatest <= tdblatest，停止增量同步
                    // 包括tapilatest == tdblatest本身的数据也不是增量数据
                    if (parsedTime <= tdblatest) {
                        hasOldData = true;
                        stopIncremental = true;
                        skipped++;
                        // 继续检查当前页剩余数据，但标记为已停止
                    } else if (!stopIncremental) {
                        // 只有在未停止增量同步且时间戳大于数据库最新时间的数据才是增量数据
                        allIncrementalBills.push(bill);
                    } else {
                        // 已经停止增量同步，跳过数据
                        skipped++;
                    }
                }
                // 如果没有发现存量数据，且当前页是满的，继续查询下一页
                if (!hasOldData && apiBills.length === pageSize) {
                    currentPage++;
                } else {
                    // 如果发现了存量数据，或者当前页未满，则停止
                    break;
                }
            }
            if (allIncrementalBills.length === 0) {
                const duration = Date.now() - startTime;
                const result = {
                    success: true,
                    message: '没有新的数据需要同步',
                    synced: 0,
                    failed: 0,
                    incremental: true,
                    skipped,
                    apiCalls: currentPage,
                    duration
                };

                // 保存同步历史记录（没有新数据的情况）
                try {
                    await SyncHistory.create({
                        sync_type: 'incremental',
                        billing_month: billingMonth,
                        status: '成功',
                        synced_count: 0,
                        failed_count: 0,
                        total_count: 0,
                        message: '没有新的数据需要同步',
                        duration: Math.floor(duration / 1000)
                    });
                } catch (historyError) {
                    console.error('保存增量同步历史记录失败:', historyError.message);
                }

                return result;
            }
            // 3. 转换数据格式
            const transformedBills = allIncrementalBills.map(bill => transformBillData(bill));
            // 4. 批量插入数据库
            let synced = 0;
            let failed = 0;
            const errors = [];
            for (const billData of transformedBills) {
                try {
                    const result = await Bill.create(billData);
                    synced++;
                    if (result.changes === 0) {
                    }
                } catch (error) {
                    failed++;
                    const errorMsg = `账单 ${billData.billing_no || 'unknown'} 同步失败: ${error.message}`;
                    console.error(errorMsg, { error: error.code });
                    errors.push(errorMsg);
                }
            }
            const duration = Date.now() - startTime;
            const result = {
                success: true,
                total: totalApiBills,
                synced,
                failed,
                incremental: true,
                skipped,
                apiCalls: currentPage,
                duration,
                errors: errors.slice(0, 10)
            };

            // 保存同步历史记录
            try {
                await SyncHistory.create({
                    sync_type: 'incremental',
                    billing_month: billingMonth,
                    status: '成功',
                    synced_count: synced,
                    failed_count: failed,
                    total_count: allIncrementalBills.length,
                    message: result.message || '增量数据同步完成',
                    duration: Math.floor(duration / 1000)
                });
            } catch (historyError) {
                console.error('保存增量同步历史记录失败:', historyError.message);
            }

            return result;
        } catch (error) {
            console.error('数据同步失败:', error.message);

            // 保存失败历史记录
            try {
                await SyncHistory.create({
                    sync_type: 'incremental',
                    billing_month: billingMonth,
                    status: '失败',
                    synced_count: 0,
                    failed_count: 0,
                    total_count: 0,
                    message: error.message || '增量数据同步失败',
                    duration: 0
                });
            } catch (historyError) {
                console.error('保存增量同步历史记录失败:', historyError.message);
            }

            throw error;
        } finally {
            this.syncing = false;
            this.progress = {
                percentage: 0,
                current: 0,
                total: 0,
                stage: 'idle'
            };
        }
    }
    /**
     * 检查同步状态
     * @returns {boolean} 是否正在同步
     */
    isSyncing() {
        return this.syncing;
    }
    /**
     * 获取当前同步进度
     * @returns {Object} 进度信息
     */
    getProgress() {
        return {
            syncing: this.syncing,
            progress: this.progress,
            result: this.syncResult
        };
    }
    /**
     * 异步启动同步（在后台执行）
     * @param {string} billingMonth - 账单月份 (YYYY-MM)
     * @returns {Promise} 立即返回的Promise
     */
    async startSync(billingMonth) {
        // 如果正在同步，不执行
        if (this.syncing) {
            throw new Error('数据同步正在进行中，请稍后再试');
        }
        // 立即返回，让同步在后台进行
        this.startSyncAsync(billingMonth).catch(error => {
            console.error('后台同步失败:', error);
            this.syncResult = {
                success: false,
                message: error.message,
                error: error
            };
        });
        return {
            success: true,
            message: '同步已开始，请通过进度接口查看同步状态'
        };
    }
    /**
     * 后台异步执行同步
     * @param {string} billingMonth - 账单月份 (YYYY-MM)
     */
    async startSyncAsync(billingMonth) {
        this.syncing = true;
        this.syncResult = null;
        this.progress = {
            percentage: 0,
            current: 0,
            total: 0,
            stage: 'clearing'
        };
        const startTime = Date.now();
        try {
            // 0. 全量同步前先清空数据库表
            this.progress.stage = 'clearing';
            const deleteResult = await Bill.deleteAll();
            this.progress.percentage = 5;
            this.progress.current = deleteResult.count;
            // 1. 从API获取所有账单数据
            this.progress.stage = 'fetching';
            this.progress.total = 0;
            this.progress.current = 0;
            this.progress.percentage = 0;
            // 使用进度回调来更新获取数据的进度
            const apiBills = await apiService.fetchAllBills(billingMonth, 100, (current, total) => {
                this.progress.current = current;
                this.progress.total = total;
                // 阶段1进度：0-50%
                this.progress.percentage = Math.floor((current / total) * 50);
            });
            // 确保进度显示为50%
            this.progress.current = apiBills.length;
            this.progress.total = apiBills.length;
            this.progress.percentage = 50;
            if (apiBills.length === 0) {
                this.progress.stage = 'completed';
                this.progress.percentage = 100;
                this.syncResult = {
                    success: true,
                    message: '没有找到数据',
                    synced: 0,
                    failed: 0,
                    duration: 0
                };

                // 保存同步历史记录（没有数据的情况）
                try {
                    await SyncHistory.create({
                        sync_type: 'full',
                        billing_month: billingMonth,
                        status: '成功',
                        synced_count: 0,
                        failed_count: 0,
                        total_count: 0,
                        message: '没有找到数据',
                        duration: 0
                    });
                } catch (historyError) {
                    console.error('保存全量同步历史记录失败:', historyError.message);
                }

                return;
            }
            // 检查apiBills中是否有billingNo重复的数据
            const apiBillNoSet = new Set();
            const duplicateApiBillNos = [];
            for (const bill of apiBills) {
                if (bill.billingNo) {
                    if (apiBillNoSet.has(bill.billingNo)) {
                        duplicateApiBillNos.push(bill.billingNo);
                    }
                    apiBillNoSet.add(bill.billingNo);
                }
            }
            if (duplicateApiBillNos.length > 0) {
            } else {
            }
            // 2. 转换数据格式
            const transformedBills = apiBills.map(bill => transformBillData(bill));
            // 检查transformedBills中是否有billing_no重复的数据
            const transformedBillNoSet = new Set();
            const duplicateTransformedBillNos = [];
            for (const bill of transformedBills) {
                if (bill.billing_no) {
                    if (transformedBillNoSet.has(bill.billing_no)) {
                        duplicateTransformedBillNos.push(bill.billing_no);
                    }
                    transformedBillNoSet.add(bill.billing_no);
                }
            }
            if (duplicateTransformedBillNos.length > 0) {
            } else {
            }
            // 3. 批量插入数据库
            this.progress.stage = 'saving';
            let synced = 0;
            let failed = 0;
            const errors = [];
            for (let i = 0; i < transformedBills.length; i++) {
                const billData = transformedBills[i];
                try {
                    const result = await Bill.create(billData);
                    synced++;
                    if (result.changes === 0) {
                    }
                } catch (error) {
                    failed++;
                    const errorMsg = `账单 ${billData.billing_no || 'unknown'} 同步失败: ${error.message}`;
                    console.error(errorMsg, { error: error.code });
                    errors.push(errorMsg);
                }
                // 阶段2：数据处理入库（50-100%）
                this.progress.current = i + 1;
                this.progress.total = transformedBills.length;
                this.progress.percentage = 50 + Math.floor((i + 1) / transformedBills.length * 50);
            }
            this.progress.stage = 'completed';
            this.progress.percentage = 100;
            const duration = Date.now() - startTime;
            this.syncResult = {
                success: true,
                total: apiBills.length,
                synced,
                failed,
                duration,
                errors: errors.slice(0, 10)
            };

            // 保存同步历史记录
            try {
                await SyncHistory.create({
                    sync_type: 'full',
                    billing_month: billingMonth,
                    status: '成功',
                    synced_count: synced,
                    failed_count: failed,
                    total_count: apiBills.length,
                    message: '全量数据同步完成',
                    duration: Math.floor(duration / 1000)
                });
            } catch (historyError) {
                console.error('保存全量同步历史记录失败:', historyError.message);
            }
        } catch (error) {
            console.error('数据同步失败:', error.message);
            this.syncResult = {
                success: false,
                message: error.message,
                error: error
            };

            // 保存失败历史记录
            try {
                await SyncHistory.create({
                    sync_type: 'full',
                    billing_month: billingMonth,
                    status: '失败',
                    synced_count: 0,
                    failed_count: 0,
                    total_count: 0,
                    message: error.message || '全量数据同步失败',
                    duration: 0
                });
            } catch (historyError) {
                console.error('保存全量同步历史记录失败:', historyError.message);
            }

            throw error;
        } finally {
            this.syncing = false;
            this.progress = {
                percentage: 0,
                current: 0,
                total: 0,
                stage: 'idle'
            };
        }
    }
}
module.exports = new SyncService();

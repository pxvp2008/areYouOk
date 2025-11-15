// API调用服务
// 封装智谱AI接口调用逻辑
const axios = require('axios');
const Token = require('../database/models/Token');
class ApiService {
    constructor() {
        this.apiUrl = process.env.BIGMODEL_API_URL || 'https://bigmodel.cn/api/finance/expenseBill/expenseBillList';
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1秒
        // 公共分页配置
        this.defaultPageSize = 100; // 默认每页大小
        this.minDelay = 500; // API调用最小延迟(毫秒)
        this.maxDelay = 2000; // API调用最大延迟(毫秒)
    }
    /**
     * 从数据库获取API Token
     * @returns {Promise<string>} Token字符串
     * @throws {Error} 如果未找到Token
     */
    async getTokenFromDB() {
        const tokenRecord = await Token.get();
        if (!tokenRecord || !tokenRecord.token) {
            throw new Error('未在数据库中找到API Token，请先在设置页面配置Token');
        }
        return tokenRecord.token;
    }

    /**
     * 调用智谱AI账单查询接口
     * @param {string} billingMonth - 账单月份 (YYYY-MM)
     * @param {number} pageNum - 页码 (从1开始)
     * @param {number} pageSize - 每页记录数
     * @param {number} retryCount - 重试次数
     * @returns {Promise<Object>} API响应数据
     */
    async fetchBills(billingMonth, pageNum = 1, pageSize = 20, retryCount = 0) {
        // 动态从数据库获取最新Token
        const token = await this.getTokenFromDB();

        const params = {
            billingMonth,
            pageNum,
            pageSize
        };
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        try {
            const response = await axios.get(this.apiUrl, {
                params,
                headers,
                timeout: 10000 // 10秒超时
            });
            if (response.data.code !== 200) {
                throw new Error(`API返回错误: ${response.data.msg || '未知错误'}`);
            }
            return response.data;
        } catch (error) {
            console.error(`API调用失败 (尝试 ${retryCount + 1}/${this.maxRetries}):`, error.message);
            // 如果是网络错误且还有重试次数，则重试
            if (retryCount < this.maxRetries && this.isRetryableError(error)) {
                await this.delay(this.retryDelay);
                return this.fetchBills(billingMonth, pageNum, pageSize, retryCount + 1);
            }
            // 重试次数用完或不可重试的错误
            throw new Error(`API调用失败: ${error.message}`);
        }
    }
    /**
     * 获取账单数据（自动分页）
     * @param {string} billingMonth - 账单月份 (YYYY-MM)
     * @param {number} pageSize - 每页记录数，默认为defaultPageSize
     * @param {Function} onProgress - 进度回调函数，接收 (current, total) 参数
     * @returns {Promise<Array>} 所有账单数据
     */
    async fetchAllBills(billingMonth, pageSize = null, onProgress = null) {
        // 如果未指定pageSize，使用默认配置
        if (pageSize === null) {
            pageSize = this.defaultPageSize;
        }
        const allBills = [];
        let pageNum = 1;
        let hasMore = true;
        let totalPages = null; // 先设为null，在第一次获取后确定
        const apiBillNoSet = new Set();
        const duplicateApiBillNos = [];
        while (hasMore) {
            try {
                const data = await this.fetchBills(billingMonth, pageNum, pageSize);
                if (!data.rows || data.rows.length === 0) {
                    hasMore = false;
                    // 如果有进度回调，报告完成
                    if (onProgress && totalPages) {
                        onProgress(allBills.length, allBills.length);
                    }
                } else {
                    allBills.push(...data.rows);
                    // 在第一次获取后确定总页数
                    if (totalPages === null) {
                        totalPages = Math.ceil(data.total / pageSize);
                    }
                    // 检查当前页数据中是否有重复的billingNo
                    for (const bill of data.rows) {
                        if (bill.billingNo) {
                            if (apiBillNoSet.has(bill.billingNo)) {
                                duplicateApiBillNos.push(bill.billingNo);
                            }
                            apiBillNoSet.add(bill.billingNo);
                        }
                    }
                    // 如果有进度回调，报告当前进度
                    if (onProgress) {
                        onProgress(allBills.length, data.total);
                    }
                    // 检查是否还有更多数据
                    if (pageNum >= totalPages) {
                        hasMore = false;
                    } else {
                        pageNum++;
                    }
                }
                // 在下次请求前添加随机延迟，防止被封
                if (hasMore) {
                    const delay = this.getRandomDelay();
                    await this.delay(delay);
                }
            } catch (error) {
                console.error(`获取第${pageNum}页数据失败:`, error.message);
                throw error;
            }
        }
        if (duplicateApiBillNos.length > 0) {
        } else {
        }
        return allBills;
    }
    /**
     * 检查错误是否可重试
     * @param {Error} error - 错误对象
     * @returns {boolean} 是否可重试
     */
    isRetryableError(error) {
        // 网络错误、超时错误、5xx服务器错误可重试
        if (error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ECONNREFUSED' ||
            error.code === 'ENOTFOUND' ||
            (error.response && error.response.status >= 500)) {
            return true;
        }
        return false;
    }
    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * 生成随机延迟（minDelay-maxDelay毫秒）
     * @returns {number} 延迟毫秒数
     */
    getRandomDelay() {
        const range = this.maxDelay - this.minDelay;
        return Math.floor(Math.random() * range) + this.minDelay;
    }
}
module.exports = new ApiService();

// 数据转换工具函数
// 处理API返回数据的格式转换
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const customParseFormat = require('dayjs/plugin/customParseFormat');
// 加载插件
dayjs.extend(utc);
dayjs.extend(customParseFormat);
/**
 * 从billingNo中解析transaction_time
 * @param {Object} apiData - API返回的账单数据
 * @returns {string|null} 解析出的transaction_time字符串，格式：YYYY-MM-DD HH:mm:ss.SSS
 */
function extractTransactionTime(apiData) {
    if (apiData.billingNo && apiData.customerId) {
        try {
            const customerId = apiData.customerId;
            const billingNo = apiData.billingNo;
            // 在billingNo中查找customerId的位置
            const index = billingNo.indexOf(customerId);
            if (index !== -1) {
                // 截取customerId后面的所有字符
                const afterCustomer = billingNo.substring(index + customerId.length);
                // 从剩余字符串中提取前13位（时间戳）
                const timestampStr = afterCustomer.substring(0, 13);
                if (timestampStr.length === 13) {
                    const timestamp = parseInt(timestampStr, 10);
                    if (!isNaN(timestamp)) {
                        // 使用dayjs处理时区转换
                        // 1. 将时间戳作为UTC时间解析
                        // 2. 添加8小时转换为北京时间
                        // 3. 格式化为 YYYY-MM-DD HH:mm:ss.SSS
                        const transactionTime = dayjs.utc(timestamp).local().format('YYYY-MM-DD HH:mm:ss.SSS');
                        return transactionTime;
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } catch (error) {
            console.error('提取transaction_time失败:', error.message);
            return null;
        }
    }
    return null;
}
/**
 * 转换API账单数据为数据库格式
 * @param {Object} apiData - API返回的账单数据
 * @returns {Object} 转换后的数据
 */
function transformBillData(apiData) {
    // 字段映射：将API字段名转换为数据库字段名（camelCase -> snake_case）
    const fieldMap = {
        billingNo: 'billing_no',
        billingDate: 'billing_date',
        billingTime: 'billing_time',
        orderNo: 'order_no',
        customerId: 'customer_id',
        apiKey: 'api_key',
        modelCode: 'model_code',
        modelProductType: 'model_product_type',
        modelProductSubtype: 'model_product_subtype',
        modelProductCode: 'model_product_code',
        modelProductName: 'model_product_name',
        paymentType: 'payment_type',
        startTime: 'start_time',
        endTime: 'end_time',
        businessId: 'business_id',
        costPrice: 'cost_price',
        costUnit: 'cost_unit',
        usageCount: 'usage_count',
        usageExempt: 'usage_exempt',
        usageUnit: 'usage_unit',
        currency: 'currency',
        settlementAmount: 'settlement_amount',
        giftDeductAmount: 'gift_deduct_amount',
        dueAmount: 'due_amount',
        paidAmount: 'paid_amount',
        unpaidAmount: 'unpaid_amount',
        billingStatus: 'billing_status',
        invoicingAmount: 'invoicing_amount',
        invoicedAmount: 'invoiced_amount',
        tokenAccountId: 'token_account_id',
        tokenResourceNo: 'token_resource_no',
        tokenResourceName: 'token_resource_name',
        deductUsage: 'deduct_usage',
        deductAfter: 'deduct_after',
        timeWindow: 'time_window',
        originalAmount: 'original_amount',
        originalCostPrice: 'original_cost_price',
        apiUsage: 'api_usage',
        discountRate: 'discount_rate',
        discountType: 'discount_type',
        creditPayAmount: 'credit_pay_amount',
        tokenType: 'token_type',
        cashAmount: 'cash_amount',
        thirdParty: 'third_party'
    };
    // 创建转换后的数据对象
    const transformedData = {};
    // 复制所有字段
    for (const [apiKey, dbKey] of Object.entries(fieldMap)) {
        if (apiData[apiKey] !== undefined) {
            transformedData[dbKey] = apiData[apiKey];
        }
    }
    // 特殊处理1：拆分timeWindow
    if (apiData.timeWindow) {
        const timeWindow = apiData.timeWindow;
        const timeParts = timeWindow.split('~');
        if (timeParts.length === 2) {
            transformedData.time_window_start = timeParts[0].trim();
            transformedData.time_window_end = timeParts[1].trim();
        } else {
        }
    }
    // 特殊处理2：从billingNo提取transaction_time
    const transactionTime = extractTransactionTime(apiData);
    if (transactionTime) {
        transformedData.transaction_time = transactionTime;
    }
    return transformedData;
}
/**
 * 验证转换后的数据
 * @param {Object} data - 转换后的数据
 * @returns {Object} 验证结果
 */
function validateTransformedData(data) {
    const errors = [];
    // 必填字段检查
    if (!data.billing_no) {
        errors.push('缺少billing_no字段');
    }
    if (!data.customer_id) {
        errors.push('缺少customer_id字段');
    }
    // 数据类型检查
    if (data.cost_price && typeof data.cost_price !== 'number') {
        errors.push('cost_price必须是数字类型');
    }
    if (data.usage_count && typeof data.usage_count !== 'number') {
        errors.push('usage_count必须是数字类型');
    }
    if (data.transaction_time && !(data.transaction_time instanceof Date)) {
        errors.push('transaction_time必须是Date类型');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * 批量转换数据
 * @param {Array} apiDataList - API数据列表
 * @returns {Array} 转换后的数据列表
 */
function transformBillDataList(apiDataList) {
    return apiDataList.map((apiData, index) => {
        try {
            const transformed = transformBillData(apiData);
            const validation = validateTransformedData(transformed);
            if (!validation.valid) {
            }
            return transformed;
        } catch (error) {
            console.error(`第${index + 1}条数据转换失败:`, error.message);
            return null;
        }
    }).filter(item => item !== null);
}
module.exports = {
    transformBillData,
    validateTransformedData,
    transformBillDataList,
    extractTransactionTime
};

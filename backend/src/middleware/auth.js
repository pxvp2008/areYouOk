const axios = require('axios');

/**
 * 认证中间件 - 验证API Token
 * 从请求头中提取Token并验证其有效性
 * 如果验证失败，返回401状态码
 * 如果验证成功，将token附加到request对象并调用next()
 */
const authMiddleware = async (req, res, next) => {
    try {
        // 检查Authorization header是否存在
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: '缺少有效的API Token'
            });
        }

        // 提取token
        const token = authHeader.substring(7);

        // 验证token是否有效
        const isValidToken = await verifyToken(token);

        if (!isValidToken) {
            return res.status(401).json({
                success: false,
                message: 'API Token无效或已过期'
            });
        }

        // 将token附加到request对象，供后续中间件和路由使用
        req.token = token;
        next();

    } catch (error) {
        console.error('认证中间件错误:', error);
        return res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 验证Token是否有效
 * @param {string} token - 要验证的token
 * @returns {Promise<boolean>} 验证结果
 */
const verifyToken = async (token) => {
    try {
        // 使用提供的token调用智谱AI API进行验证
        const authHeader = `Bearer ${token}`;

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
        console.error('Token验证失败:', error);
        return false;
    }
};

module.exports = {
    authMiddleware,
    verifyToken
};
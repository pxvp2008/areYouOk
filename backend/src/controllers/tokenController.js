// Token控制器
const Token = require('../database/models/Token');
const { verifyToken } = require('../middleware/auth');

class TokenController {
    // 验证Token
    static async verifyToken(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token不能为空'
                });
            }

            const isValid = await verifyToken(token);

            if (isValid) {
                res.json({
                    success: true,
                    message: 'Token验证成功'
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: 'Token无效或已过期'
                });
            }
        } catch (error) {
            console.error('验证Token失败:', error);
            res.status(500).json({
                success: false,
                message: '验证Token失败: ' + error.message
            });
        }
    }

    // 保存Token
    static async saveToken(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token不能为空'
                });
            }

            const result = await Token.save(token);

            res.json({
                success: true,
                message: 'Token保存成功',
                data: result
            });
        } catch (error) {
            console.error('保存Token失败:', error);
            res.status(500).json({
                success: false,
                message: '保存Token失败: ' + error.message
            });
        }
    }

    // 获取Token
    static async getToken(req, res) {
        try {
            const token = await Token.get();

            res.json({
                success: true,
                data: token
            });
        } catch (error) {
            console.error('获取Token失败:', error);
            res.status(500).json({
                success: false,
                message: '获取Token失败: ' + error.message
            });
        }
    }

    // 删除Token
    static async deleteToken(req, res) {
        try {
            await Token.delete();

            res.json({
                success: true,
                message: 'Token删除成功'
            });
        } catch (error) {
            console.error('删除Token失败:', error);
            res.status(500).json({
                success: false,
                message: '删除Token失败: ' + error.message
            });
        }
    }
}

module.exports = TokenController;

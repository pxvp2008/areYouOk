// 数据库连接配置
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库文件路径 - 从环境变量读取，未设置则使用默认路径
// 环境变量中的路径相对于项目根目录解析
const defaultDbPath = path.join(__dirname, '../../../data/expense_bills.db');
const DB_PATH = process.env.DB_PATH
    ? path.resolve(__dirname, '../../', process.env.DB_PATH)
    : defaultDbPath;

// 确保数据库目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        // 启用外键约束
        db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
                console.error('设置PRAGMA失败:', err.message);
            }
        });
    }
});

module.exports = db;

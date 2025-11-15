// 数据库初始化脚本
const db = require('./connection');
const fs = require('fs');
const path = require('path');

// 读取SQL文件
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// 执行初始化
db.serialize(() => {
    

    // 创建表
    db.exec(schema, (err) => {
        if (err) {
            console.error('数据库初始化失败:', err.message);
            process.exit(1);
        } else {
            
        }

        // 关闭数据库连接
        db.close((err) => {
            if (err) {
                console.error('关闭数据库连接失败:', err.message);
                process.exit(1);
            } else {
                
                process.exit(0);
            }
        });
    });
});

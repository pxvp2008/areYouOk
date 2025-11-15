# 数据库目录

## 文件说明

### schema.sql
数据库表结构定义文件，包含：
- expense_bills 账单明细表
- 索引定义
- 字段说明

### connection.js
数据库连接配置：
- SQLite3 数据库连接
- 连接参数设置
- 自动创建数据库目录

### init.js
数据库初始化脚本：
- 读取 schema.sql
- 执行建表语句
- 创建索引

### models/Bill.js
账单数据模型：
- 数据转换逻辑
  - timeWindow 拆分为 timeWindowStart 和 timeWindowEnd
  - 从 billingNo 提取 transaction_time（13位时间戳）
- 数据插入方法

### migrations/
数据库迁移文件目录，用于管理数据库结构变更

## 数据库字段说明

### 特殊处理字段

1. **timeWindow**
   - 原始格式：`2025-11-05 21:09:00~2025-11-05 21:10:00`
   - 拆分后：`timeWindowStart` 和 `timeWindowEnd`

2. **transaction_time**
   - 从 `billingNo` 中提取 13 位时间戳
   - 转换逻辑：截取 `customerId` 后的 13 位数字
   - 格式：精确到毫秒的 datetime

3. **create_time**
   - 自动记录数据插入时间
   - 类型：DATETIME
   - 默认值：CURRENT_TIMESTAMP

## 使用方法

1. 安装依赖：
   ```bash
   npm install sqlite3
   ```

2. 初始化数据库：
   ```bash
   node src/database/init.js
   ```

3. 在代码中使用：
   ```javascript
   const Bill = require('./database/models/Bill');
   await Bill.create(billData);
   ```

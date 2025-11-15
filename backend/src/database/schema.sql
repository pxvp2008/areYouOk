-- 数据库模式定义
-- 账单表结构

-- 账单明细表
CREATE TABLE IF NOT EXISTS expense_bills (
    -- 基础信息
    id TEXT PRIMARY KEY,                   -- 主键ID（UUID，无连字符）
    billing_no TEXT,                        -- 账单编号（唯一但非主键）
    billing_date TEXT,                      -- 账单日期（YYYY-MM-DD）
    billing_time TEXT,                      -- 账单时间
    order_no TEXT,                          -- 订单编号
    customer_id TEXT,                       -- 客户ID

    -- 模型信息
    api_key TEXT,                           -- API密钥
    model_code TEXT,                        -- 模型代码
    model_product_type TEXT,                -- 模型产品类型
    model_product_subtype TEXT,             -- 模型产品子类型
    model_product_code TEXT,                -- 模型产品代码
    model_product_name TEXT,                -- 模型产品名称

    -- 支付信息
    payment_type TEXT,                      -- 支付类型
    start_time TEXT,                        -- 开始时间
    end_time TEXT,                          -- 结束时间
    business_id INTEGER,                    -- 业务ID

    -- 成本信息
    cost_price REAL,                        -- 成本价格（单位：元/千token）
    cost_unit TEXT,                         -- 成本单位
    usage_count INTEGER,                    -- 使用量
    usage_exempt REAL,                      -- 免费用量
    usage_unit TEXT,                        -- 用量单位
    currency TEXT,                          -- 货币类型

    -- 金额信息
    settlement_amount REAL,                 -- 结算金额
    gift_deduct_amount REAL,                -- 赠款抵扣金额
    due_amount REAL,                        -- 应付金额
    paid_amount REAL,                       -- 已付金额
    unpaid_amount REAL,                     -- 未付金额

    -- 状态信息
    billing_status TEXT,                    -- 账单状态

    -- 开票信息
    invoicing_amount REAL,                  -- 开票金额
    invoiced_amount REAL,                   -- 已开票金额

    -- Token信息
    token_account_id INTEGER,               -- Token账户ID
    token_resource_no TEXT,                 -- Token资源编号
    token_resource_name TEXT,               -- Token资源名称
    deduct_usage INTEGER,                   -- 抵扣用量
    deduct_after TEXT,                      -- 抵扣后信息

    -- 时间窗口（需拆分）
    time_window TEXT,                       -- 时间窗口（原始字段）
    time_window_start TEXT,                 -- 时间窗口开始时间
    time_window_end TEXT,                   -- 时间窗口结束时间

    -- 其他信息
    original_amount REAL,                   -- 原始金额
    original_cost_price REAL,               -- 原始成本价格
    api_usage INTEGER,                      -- API使用次数
    discount_rate REAL,                     -- 折扣率
    discount_type TEXT,                     -- 折扣类型
    credit_pay_amount REAL,                 -- 信用支付金额
    token_type TEXT,                        -- Token类型（输入/输出）
    cash_amount REAL,                       -- 现金金额
    third_party REAL,                       -- 第三方金额

    -- 元数据
    transaction_time DATETIME,              -- 交易时间（从billingNo提取）
    create_time DATETIME DEFAULT(datetime(CURRENT_TIMESTAMP, 'localtime'))   -- 创建时间
);

-- API Token配置表
CREATE TABLE IF NOT EXISTS api_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    provider TEXT DEFAULT 'zhipu',
    created_at DATETIME DEFAULT(datetime(CURRENT_TIMESTAMP, 'localtime')),
    updated_at DATETIME DEFAULT(datetime(CURRENT_TIMESTAMP, 'localtime'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_billing_date ON expense_bills(billing_date);
CREATE INDEX IF NOT EXISTS idx_customer_id ON expense_bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_model_code ON expense_bills(model_code);
CREATE INDEX IF NOT EXISTS idx_time_window_start ON expense_bills(time_window_start);
CREATE INDEX IF NOT EXISTS idx_create_time ON expense_bills(create_time);

-- 同步历史日志表
CREATE TABLE IF NOT EXISTS sync_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_type TEXT NOT NULL CHECK(sync_type IN ('incremental', 'full')),
    billing_month TEXT NOT NULL,
    sync_time DATETIME NOT NULL DEFAULT(datetime(CURRENT_TIMESTAMP, 'localtime')),
    status TEXT NOT NULL,
    synced_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    message TEXT,
    duration INTEGER
);

-- 创建同步历史索引
CREATE INDEX IF NOT EXISTS idx_sync_history_type ON sync_history(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_history_time ON sync_history(sync_time);
CREATE INDEX IF NOT EXISTS idx_sync_history_month ON sync_history(billing_month);

-- 自动同步配置表
CREATE TABLE IF NOT EXISTS auto_sync_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enabled INTEGER NOT NULL DEFAULT 0,           -- 是否启用自动同步 (0/1)
    frequency_seconds INTEGER NOT NULL DEFAULT 10, -- 同步频率（秒）
    next_sync_time DATETIME,                      -- 下次同步时间
    last_sync_time DATETIME,                      -- 最后一次同步时间
    created_at DATETIME NOT NULL DEFAULT(datetime(CURRENT_TIMESTAMP, 'localtime')),
    updated_at DATETIME NOT NULL DEFAULT(datetime(CURRENT_TIMESTAMP, 'localtime'))
);

-- 创建自动同步配置索引
CREATE INDEX IF NOT EXISTS idx_auto_sync_enabled ON auto_sync_config(enabled);
CREATE INDEX IF NOT EXISTS idx_auto_sync_next_time ON auto_sync_config(next_sync_time);

-- 会员等级调用次数限制表
CREATE TABLE IF NOT EXISTS membership_tier_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tier_name TEXT NOT NULL UNIQUE,           -- 会员等级名称（如：GLM Coding Lite）
    period_hours INTEGER NOT NULL DEFAULT 5,   -- 时间周期（小时）
    call_limit INTEGER NOT NULL,               -- 调用次数限制
    created_at DATETIME NOT NULL DEFAULT(datetime(CURRENT_TIMESTAMP, 'localtime')),
    updated_at DATETIME NOT NULL DEFAULT(datetime(CURRENT_TIMESTAMP, 'localtime'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tier_name ON membership_tier_limits(tier_name);

-- 初始化会员等级限制数据
INSERT OR IGNORE INTO membership_tier_limits (tier_name, period_hours, call_limit) VALUES
    ('GLM Coding Lite', 5, 2400),
    ('GLM Coding Pro', 5, 12000),
    ('GLM Coding Max', 5, 48000);

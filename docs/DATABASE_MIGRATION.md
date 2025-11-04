# 🗃️ Deno Deploy 数据库迁移指南

## 📖 概述

这个指南将帮助你在Deno Deploy上配置数据库迁移。提供了三种迁移方式：

1. **自动迁移**（推荐用于生产） - 部署时自动运行
2. **手动迁移** - 通过本地脚本运行
3. **应急迁移** - 直接使用数据库客户端

## 🚀 方式1：自动迁移（推荐）

### 1.1 在Deno Deploy中配置环境变量

1. 登录 [Deno Deploy Console](https://console.deno.com)
2. 选择你的项目 `sams-ai`
3. 进入 **Settings** → **Environment Variables**
4. 添加以下变量：

```bash
# 数据库连接
DATABASE_URL=postgresql://username:password@host:port/database

# 启用自动迁移
AUTO_MIGRATE=true

# 应用环境
DENO_ENV=production

# JWT密钥（生成新的）
JWT_SECRET=your_production_jwt_secret_32_chars_or_longer

# 可选：SSL配置（AWS RDS等）
DB_SSL=true
# DB_SSL_REJECT_UNAUTHORIZED=false  # 仅在SSL证书有问题时设置
```

### 1.2 部署后验证

部署完成后，检查Deno Deploy的部署日志：

```
✅ 期望看到的日志：
🔄 Running automatic database migration...
📋 Tables not found, running initial migration...
✅ Database migration completed successfully
🚀 Authentication system initialized
```

❌ **如果看到错误日志**：

```
❌ Auto-migration failed: PostgresError: relation "users" does not exist
```

这说明迁移没有运行，请检查：

- `AUTO_MIGRATE=true` 是否设置正确
- `DATABASE_URL` 是否有效
- 数据库权限是否允许创建表

## 🔧 方式2：手动迁移

如果自动迁移不工作，可以手动运行：

### 2.1 本地运行迁移

```bash
# 设置生产数据库URL
export DATABASE_URL="postgresql://username:password@host:port/database"

# 运行迁移
deno task db:migrate

# 或直接运行脚本
deno run -A scripts/migrate.ts
```

### 2.2 使用特定SQL文件

```bash
# 使用自定义SQL文件
deno run -A scripts/migrate.ts --file=sql/schema.sql --database-url="postgresql://..."
```

## 🆘 方式3：应急迁移（直接SQL）

如果脚本无法运行，直接在数据库中执行SQL：

### 3.1 使用psql客户端

```bash
# 连接到数据库
psql "postgresql://username:password@host:port/database"

# 或者从文件执行
psql "postgresql://username:password@host:port/database" -f sql/schema.sql
```

### 3.2 SQL内容

如果需要手动执行，复制 `sql/schema.sql` 的内容到数据库客户端：

```sql
-- 主要表结构
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    secret_hash BYTEA NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fresh BOOLEAN NOT NULL DEFAULT TRUE,
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 索引和触发器（见完整文件）
```

## 🔍 验证迁移

### 检查表是否创建成功

```sql
-- 连接到数据库后执行
\dt  -- PostgreSQL命令，列出所有表

-- 或者用SQL
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

期望看到：

- `users`
- `sessions`

### 测试应用功能

1. 访问你的应用URL
2. 尝试注册新用户
3. 检查是否能成功创建账户
4. 检查登录功能

## ⚠️ 故障排除

### 错误1：连接失败

```
❌ Database connection failed: connection refused
```

**解决方案**：

- 检查 `DATABASE_URL` 格式
- 确认数据库服务器运行中
- 检查防火墙/安全组设置

### 错误2：权限不足

```
❌ PostgresError: permission denied to create table
```

**解决方案**：

- 确认数据库用户有 `CREATE` 权限
- 检查是否连接到正确的数据库

### 错误3：SSL连接问题

```
❌ SSL connection failed
```

**解决方案**：

```bash
# 在Deno Deploy中添加
DB_SSL=false
# 或者
DB_SSL_REJECT_UNAUTHORIZED=false
```

## 🚨 AWS RDS特殊配置

如果使用AWS RDS，需要特殊设置：

```bash
# Deno Deploy环境变量
DATABASE_URL=postgresql://username:password@your-rds-endpoint.rds.amazonaws.com:5432/postgres
DB_SSL=true
AUTO_MIGRATE=true

# 安全组确保端口5432开放给Deno Deploy IP
```

## 🔄 持续部署

配置完成后，每次推送代码到GitHub：

1. GitHub Actions 构建项目
2. Deno Deploy 自动部署
3. 应用启动时检查数据库
4. 如果表不存在且 `AUTO_MIGRATE=true`，自动运行迁移
5. 应用正常启动

这样就实现了完全自动化的数据库迁移！

## 📞 需要帮助？

如果遇到问题：

1. 检查Deno Deploy的部署日志
2. 验证所有环境变量设置
3. 测试数据库连接
4. 检查数据库权限

大部分问题都是由于 `DATABASE_URL` 格式错误或数据库权限不足造成的。

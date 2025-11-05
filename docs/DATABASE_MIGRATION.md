# 🗃️ 数据库迁移指南

## 📖 概述

本指南专注于数据库迁移操作，提供三种迁移方式：

1. **手动迁移**（推荐） - 通过本地脚本运行
2. **应急迁移** - 直接使用数据库客户端
3. **CI/CD 迁移** - 在部署流程中运行

## � 方式1：手动迁移（推荐）

### 1.1 本地运行迁移

```bash
# 设置数据库连接
export DATABASE_URL="postgresql://username:password@host:port/database"

# 运行迁移脚本
deno task db:migrate

# 或者直接运行
deno run -A scripts/migrate.ts --database-url="postgresql://..."
```

### 1.2 验证迁移结果

```bash
# 检查表是否创建成功
psql "$DATABASE_URL" -c "\dt"

# 或使用 SQL 查询
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

期望看到：`users` 和 `sessions` 表

## 🆘 方式2：应急迁移（直接SQL）

如果脚本无法运行，直接在数据库中执行SQL：

### 2.1 使用psql客户端

```bash
# 连接到数据库
psql "postgresql://username:password@host:port/database"

# 从文件执行
psql "postgresql://username:password@host:port/database" -f sql/schema.sql
```

### 2.2 直接执行SQL

如果需要手动执行，可以复制 `sql/schema.sql` 的内容到数据库客户端。

## 🔄 方式3：CI/CD 集成

在部署流程中运行迁移：

```bash
# 在部署脚本中添加
DATABASE_URL="$DATABASE_URL" deno task db:migrate
```

参见 `docs/DEPLOYMENT.md` 了解完整的部署流程。

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
# 设置SSL配置环境变量
DB_SSL=true
# 如果证书验证有问题
DB_SSL_REJECT_UNAUTHORIZED=false
```

### 错误4：权限不足

确保数据库用户有以下权限：

- `CREATE` - 创建表
- `CREATE INDEX` - 创建索引
- `CREATE FUNCTION` - 创建函数/触发器

## � 相关文档

- `docs/DEPLOYMENT.md` - 完整部署流程
- `docs/MIGRATION_ARCHITECTURE.md` - 迁移系统架构
- `sql/schema.sql` - 数据库模式定义

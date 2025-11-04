# 📁 数据库迁移文件架构说明

## 文件职责分工

### 🔧 `lib/migrate.ts` - 核心迁移库

**用途**: 提供可复用的迁移函数，供应用内部使用

**功能**:

- `runMigrations(databaseUrl)` - 执行SQL迁移
- `checkDatabaseConnection(databaseUrl)` - 检查数据库连接
- `checkTablesExist(databaseUrl)` - 检查表是否存在

**使用场景**:

- 应用启动时自动迁移 (`lib/db.ts` 调用)
- 其他内部功能需要迁移时

### 🖥️ `scripts/migrate.ts` - 命令行工具

**用途**: 提供命令行接口，供开发者手动运行迁移

**功能**:

- 参数解析 (`--database-url`, `--force`)
- 用户友好的输出和错误提示
- 完整的迁移流程 (连接检查 → 表检查 → 迁移 → 验证)

**使用场景**:

- 开发环境手动迁移: `deno task db:migrate`
- 生产环境迁移: `deno task db:migrate:force`
- CI/CD流程中的显式迁移步骤

### 📄 `sql/schema.sql` - 数据库模式

**用途**: 包含实际的SQL DDL语句

**内容**:

- 表定义 (`users`, `sessions`)
- 索引创建
- 触发器设置
- 约束定义

## 🔄 使用流程

### 开发环境

```bash
# 检查并运行迁移
deno task db:migrate

# 强制运行迁移（即使表已存在）
deno task db:migrate:force
```

### 生产环境（自动）

```typescript
// 在 lib/db.ts 的 initializeDatabase() 中
if (env === "production" || AUTO_MIGRATE === "true") {
  await runMigrations(databaseUrl);
}
```

### 生产环境（手动）

```bash
DATABASE_URL="postgresql://..." deno task db:migrate
```

## 🏗️ 架构优势

1. **职责分离**: 库函数vs用户接口分离
2. **代码复用**: `scripts/migrate.ts` 复用 `lib/migrate.ts` 的功能
3. **测试友好**: 库函数易于单元测试
4. **部署灵活**: 支持自动和手动两种迁移方式

## 🔍 故障排除

### 如果遇到"表已存在"错误

```bash
# 使用force标志
deno task db:migrate:force
```

### 如果连接失败

1. 检查 `DATABASE_URL` 格式
2. 验证数据库服务运行状态
3. 确认网络连接和防火墙设置

### 如果权限不足

确保数据库用户有以下权限:

- `CREATE` - 创建表
- `CREATE INDEX` - 创建索引
- `CREATE FUNCTION` - 创建函数/触发器

这样的架构确保了代码组织清晰，同时避免了功能重复！

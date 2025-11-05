# Deno Deploy 部署指南

本指南介绍如何将 Fresh 2 项目部署到 Deno Deploy。项目使用 GitHub App
集成，支持自动构建和部署。

## 步骤 1: 创建应用

1. 访问 https://console.deno.com
2. 使用 GitHub 登录
3. 点击 **New App**
4. 选择 GitHub 仓库
5. 授权 GitHub App
6. 确认构建配置

## 步骤 2: 环境变量

在 Deno Deploy 控制台的 **Settings** → **Environment Variables** 中添加：

```bash
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your_secret_here_32_chars_or_longer
DB_SSL=true
# 可选：如果SSL证书有问题
# DB_SSL_REJECT_UNAUTHORIZED=false
```

## 步骤 3: 数据库迁移

**重要**: 在部署前必须手动运行数据库迁移创建表结构:

```bash
# 使用你的生产数据库连接字符串
DATABASE_URL="postgresql://user:password@host:port/database" deno task db:migrate
```

## 步骤 4: 验证部署

1. 推送代码触发部署
2. 检查 Deno Deploy 控制台的构建日志
3. 访问应用并测试功能

### 部署流程

- **生产部署**: 推送到 `main` 分支自动触发
- **预览部署**: 创建 Pull Request 自动触发
- **分支部署**: 推送到其他分支创建预览

## 故障排除

- **"relation users does not exist"**: 数据库表未创建，运行
  `deno task db:migrate`
- **"DATABASE_URL is not defined"**: 检查环境变量设置
- **构建失败**: 确认 main.ts 和 deno.json 存在

### 监控和调试

在 Deno Deploy 控制台可以查看：

- 实时构建日志
- 应用性能指标
- 错误日志和追踪

本地测试构建：

```bash
deno task build && deno task start
```

## 相关文档

- `docs/DATABASE_MIGRATION.md` - 详细的数据库迁移指南
- `docs/MIGRATION_ARCHITECTURE.md` - 迁移系统架构说明

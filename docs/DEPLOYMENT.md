# Deno Deploy 部署指南

本指南介绍如何将 Fresh 2 项目部署到 Deno Deploy。

## 步骤 1: 创建应用

1. 访问 https://console.deno.com
2. 使用 GitHub 登录
3. 点击 **New App**
4. 选择 GitHub 仓库
5. 授权 GitHub App
6. 确认构建配置

## 步骤 2: 环境变量

```bash
DATABASE_URL=postgresql://user:password@host:port/database
AUTO_MIGRATE=true
DENO_ENV=production
JWT_SECRET=your_secret_here
DB_SSL=true
```

## 步骤 3: 数据库迁移

设置 `AUTO_MIGRATE=true` 自动创建表，或手动运行:

```bash
deno task db:migrate
```

## 步骤 4: 验证部署

1. 推送代码触发部署
2. 检查日志
3. 访问应用并测试功能

## 故障排除

- **"relation users does not exist"**: 检查 DATABASE_URL 和 AUTO_MIGRATE
- **构建失败**: 确认 main.ts 和 deno.json 存在

详见 `docs/DATABASE_MIGRATION.md` 获取更多迁移信息。

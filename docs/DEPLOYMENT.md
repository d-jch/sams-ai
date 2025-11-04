# 🚀 新版 Deno Deploy 部署指南# 🚀 新版 Deno Deploy 部署指南

这个指南将帮助你使用 **新版 Deno Deploy** (console.deno.com) 部署 Fresh 2
应用。这个指南将帮助你使用 **新版 Deno Deploy** (console.deno.com) 部署 Fresh 2
应用。

新版 Deno Deploy 使用 GitHub App 集成，提供零配置自动部署体验。新版 Deno Deploy
使用 GitHub App 集成，提供零配置自动部署体验。

## 📋 前置条件## 📋 前置条件

- GitHub 账户和仓库 (代码已推送)- GitHub 账户和仓库

- PostgreSQL 数据库 (推荐 Supabase 或 Neon)- Deno Deploy
  新版本账户（console.deno.com）

- Deno Deploy 账户- PostgreSQL 数据库（推荐 Supabase 或 Neon）

## ✨ 零配置自动部署特性## 🔧 步骤1: 设置 Deno Deploy 新版本

- 🚀 **GitHub App 集成** - 无需手动配置令牌### 1.1 创建 Deno Deploy 账户

- 📦 **自动框架检测** - 自动识别 Fresh 2 项目

- 🔄 **实时构建日志** - 可视化构建过程1. 访问
  [https://console.deno.com](https://console.deno.com) (**不是** dash.deno.com)

- 🌍 **全球 CDN 部署** - 自动边缘分发2. 点击 "Sign in with GitHub"

- 🔍 **预览部署** - 每个 PR 都有独立预览3. 授权 Deno Deploy 访问你的 GitHub 账户

- 🛡️ **自动 HTTPS** - SSL 证书自动管理

### 1.2 创建组织和应用

## 🔧 步骤 1: 创建 Deno Deploy 应用

1. 在 console.deno.com 创建新组织

### 1.1 访问控制台2. 点击 "+ New App"，名称为 `sams-ai`

3. 选择你的 GitHub 仓库

4. 访问 [https://console.deno.com](https://console.deno.com)4. 框架自动检测为
   **Fresh**

5. 使用 GitHub 账户登录5. 构建配置自动设置 (无需手动配置)

6. 授权 Deno Deploy 访问你的 GitHub ### 1.3 GitHub App 集成

### 1.2 创建组织和应用新版 Deno Deploy 使用 GitHub App 自动集成，**无需手动配置 token**：

1. 创建新组织 (如果没有)1. 连接仓库时，Deno Deploy 会请求 GitHub App 权限

2. 点击 **"New App"** 按钮2. 授权 Deno Deploy GitHub App 访问你的仓库

3. 选择你的 GitHub 仓库 `sams-ai`3. 部署配置自动完成

### 1.3 自动配置验证## 🔑 步骤2: 配置环境变量

Deno Deploy 会自动检测和配置：### 2.1 在 Deno Deploy 中设置环境变量

- ✅ **Framework**: Fresh (自动检测)

- ✅ **Build Command**: `deno task build` (自动配置)**新版 Deno Deploy** -
  在应用设置中配置：

- ✅ **Entry Point**: `main.ts` (自动识别)

- ✅ **Node.js**: 不需要，纯 Deno 环境1. 进入你的 Deno Deploy 应用控制台

2. 点击 "Settings" → "Environment Variables"

## 🔑 步骤 2: 配置环境变量3. 添加生产环境变量：

````bash
在 Deno Deploy 应用设置中添加环境变量：   # 数据库配置

DATABASE_URL=postgresql://user:pass@host:port/db

1. 进入应用控制台   DB_SSL=true

2. 点击 **"Settings"** → **"Environment Variables"**   

3. 添加以下环境变量：   # 安全配置  

JWT_SECRET=your_production_jwt_secret_32_chars_long

### 必需的环境变量   

# 可选: Argon2 配置

```bash   ARGON2_MEMORY_COST=131072

# 数据库配置   ARGON2_TIME_COST=4

DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require   ARGON2_PARALLELISM=4

DB_SSL=true   ```
````

# 安全配置7. 点击 "Create"

JWT_SECRET=your_production_jwt_secret_32_chars_or_longer8. **重要**:
立即复制令牌（只显示一次）

````
### 1.3 创建项目

### 可选的性能配置

1. 访问 [Projects Dashboard](https://dash.deno.com/projects)

```bash2. 点击 "New Project"

# Argon2 密码哈希配置 (生产优化)3. 项目配置：

ARGON2_MEMORY_COST=131072    # 128 MB   ```

ARGON2_TIME_COST=4           # 4 次迭代   Name: sams-ai-fresh2

ARGON2_PARALLELISM=4         # 4 并行度   Deploy method: GitHub Actions

```   ```

4. 点击 "Create Project"

### 环境变量上下文

## 🔑 步骤2: 配置GitHub Secrets

为不同环境配置不同的变量值：

- **Production**: 生产域名访问时使用### 2.1 设置部署令牌

- **Preview**: 预览部署时使用

1. 进入GitHub仓库

## 🗄️ 步骤 3: 设置生产数据库2. 导航到 `Settings` → `Secrets and variables` → `Actions`

3. 点击 "New repository secret"

### 推荐的数据库服务4. 添加Secret：
````

#### Supabase (推荐) Name: DENO_DEPLOY_TOKEN

````bash   Secret: [粘贴步骤1.2中复制的令牌]
# 访问 https://supabase.com   ```

# 创建新项目

# 获取连接字符串### 2.2 GitHub Secrets (可选)

DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

```**新版 Deno Deploy 不需要 GitHub Secrets**，但如果使用其他部署平台：



#### Neon```bash

```bash# 仅用于其他平台部署

# 访问 https://neon.tech  RAILWAY_TOKEN=your_railway_token

# 创建数据库FLY_API_TOKEN=your_fly_token

# 获取连接字符串

DATABASE_URL=postgresql://[username]:[password]@[endpoint]/[dbname]?sslmode=require# 新版 Deno Deploy 不需要:

```# DENO_DEPLOY_TOKEN (已废弃，使用 GitHub App)
````

### 初始化数据库

## 🗄️ 步骤3: 配置生产数据库

使用提供的 SQL 模式初始化数据库：

### 3.1 创建PostgreSQL数据库

````bash
# 本地连接生产数据库推荐的云PostgreSQL服务：

psql $DATABASE_URL -f sql/schema.sql

```- **Neon** (免费层): https://neon.tech

- **Supabase** (免费层): https://supabase.com

或者在数据库控制台中直接执行 `sql/schema.sql` 文件的内容。- **Railway** (付费): https://railway.app

- **AWS RDS**: https://aws.amazon.com/rds/

## 🚀 步骤 4: 部署应用

### 3.2 获取连接字符串

### 4.1 自动部署触发

数据库创建后，获取连接字符串格式：

配置完成后，部署会在以下情况自动触发：

- 推送到 `main` 分支 → **生产部署**```

- 推送到其他分支 → **预览部署**  postgresql://username:password@host:port/database?sslmode=require

- 创建 Pull Request → **PR 预览**```



### 4.2 监控部署状态### 3.3 在Deno Deploy中设置环境变量



1. 在 Deno Deploy 控制台查看构建日志1. 进入你的Deno Deploy项目

2. 构建成功后获得部署 URL2. 点击 "Settings" → "Environment Variables"

3. 检查应用健康状态3. 添加以下变量：



### 4.3 自定义域名 (可选)```bash

DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

1. 在应用设置中点击 **"Domains"**DB_SSL=true

2. 添加自定义域名JWT_SECRET=your_32_character_random_jwt_secret

3. 配置 DNS 记录ARGON2_MEMORY_COST=65536

4. SSL 证书自动生成ARGON2_TIME_COST=3

ARGON2_PARALLELISM=1

## 🔍 步骤 5: 验证部署DENO_ENV=production
````

### 5.1 测试应用端点

## 🔐 步骤4: 生成安全密钥

````bash
# 替换为你的实际部署 URL### 4.1 生成JWT Secret

export DEPLOY_URL="https://your-app-name.deno.dev"

```bash

# 测试主要端点# 使用openssl生成32字符随机字符串

curl -f $DEPLOY_URL/openssl rand -base64 32

curl -f $DEPLOY_URL/login

curl -f $DEPLOY_URL/signup# 或使用Deno

deno eval "console.log(crypto.getRandomValues(new Uint8Array(32)).reduce((a,b)=>a+String.fromCharCode(b),''))"

# 测试 API 端点```

curl -f $DEPLOY_URL/api/auth/me

```### 4.2 测试数据库连接



### 5.2 检查应用功能```bash

# 本地测试数据库连接

1. 访问注册页面，创建测试账户deno eval "

2. 测试登录功能import { Client } from 'https://deno.land/x/postgres/mod.ts';

3. 验证会话管理const client = new Client('YOUR_DATABASE_URL');

4. 检查数据库连接await client.connect();

console.log('✅ Database connection successful');

### 5.3 监控和日志await client.end();

"

- **构建日志**: 在部署历史中查看```

- **应用日志**: 实时查看运行时日志

- **性能指标**: 监控响应时间和错误率## 🏗️ 步骤5: 更新工作流配置



## 🔧 故障排除### 5.1 确认项目名称



### 常见问题解决在 `.github/workflows/deploy.yml` 中确认项目名称与Deno Deploy中创建的项目一致：



#### 1. GitHub App 权限问题```yaml

```- name: 🌐 Deploy to Deno Deploy

Error: Repository access denied  uses: denoland/deployctl@v1

```  with:

**解决方案**:    project: "sams-ai-fresh2" # 确认这个名称正确

- 重新授权 GitHub App     entrypoint: "main.ts"

- 检查组织权限设置    root: "."

- 确认仓库可见性```



#### 2. 环境变量未生效### 5.2 自定义部署配置
````

Error: DATABASE_URL is not defined如果需要修改部署配置，编辑
`.github/workflows/deploy.yml`：

````
**解决方案**:```yaml

- 检查环境变量拼写# 修改部署触发条件

- 确认变量上下文配置on:

- 重新部署以应用更改  workflow_run:

    workflows: ["Fresh 2 CI/CD Pipeline"]

#### 3. 数据库连接失败    types: [completed]

```    branches: [main] # 只在main分支部署

Error: Connection refused

```  # 手动触发

**解决方案**:  workflow_dispatch:

- 验证 DATABASE_URL 格式    inputs:

- 检查数据库服务状态        environment:

- 确认 SSL 模式配置        description: "Environment to deploy to"

        required: true

#### 4. 构建失败        default: "production"
````

Error: Build process failed

````## ✅ 步骤6: 验证部署
**解决方案**:

- 检查 `deno.json` 配置### 6.1 触发部署

- 确认所有依赖可访问

- 查看构建日志详细错误1. 推送代码到main分支

2. 检查GitHub Actions执行情况

### 调试技巧3. 确认Deno Deploy部署状态



1. **本地测试**: 使用相同环境变量本地运行### 6.2 测试部署的应用

2. **日志分析**: 查看详细的构建和运行日志  

3. **分支测试**: 使用预览部署测试更改```bash

4. **回滚**: 使用部署历史快速回滚# 测试主要端点

curl -f https://sams-ai-fresh2.deno.dev/

## 📊 部署最佳实践curl -f https://sams-ai-fresh2.deno.dev/login

curl -f https://sams-ai-fresh2.deno.dev/signup

### 性能优化```



1. **数据库连接池**: 使用连接池避免连接耗尽### 6.3 检查日志

2. **缓存策略**: 利用 Deno Deploy 的边缘缓存

3. **静态资源**: 优化图片和 CSS 资源- **GitHub Actions**: 查看工作流执行日志

4. **监控设置**: 配置性能监控和告警- **Deno Deploy**: 查看应用运行日志



### 安全最佳实践## 🔧 故障排除



1. **环境变量**: 敏感信息只存储在环境变量中### 常见问题

2. **HTTPS 强制**: Deno Deploy 自动强制 HTTPS

3. **定期更新**: 保持依赖项更新#### 1. GitHub App 权限问题

4. **访问审计**: 定期审查访问权限
````

### CI/CD 集成Error: Failed to access repository

```
项目包含的 GitHub Actions 工作流会：

- ✅ 自动运行测试**解决方案**:

- ✅ 检查代码质量  

- ✅ 构建应用- 确认 Deno Deploy GitHub App 有仓库访问权限

- ✅ 准备部署产物- 重新授权 GitHub App

- 检查组织权限设置

Deno Deploy 会在构建成功后自动获取产物进行部署。

#### 2. 构建配置问题

## 🔗 相关资源
```

- [Deno Deploy 文档](https://docs.deno.com/deploy/)Error: Build failed -
  framework not detected

- [Fresh 2 文档](https://fresh.deno.dev/) ```

- [GitHub Actions 工作流](../.github/workflows/ci.yml)

- [数据库模式](../sql/schema.sql) **解决方案**:

- [部署配置助手](../scripts/setup-deployment.ts)

- 确认仓库包含 `deno.json` 文件

---- Fresh 2 框架通常自动检测

- 检查构建配置是否正确

## 🎉 恭喜！

#### 3. 数据库连接失败

你现在拥有一个完全自动化的 Fresh 2 应用部署流程！

````
- 🚀 零配置自动部署Error: Failed to connect to database

- 🌍 全球 CDN 分发  ```

- 🔍 实时监控和日志

- 🛡️ 企业级安全性**解决方案**:

- 📈 自动扩缩容

- 检查`DATABASE_URL`格式

享受现代化的无服务器部署体验吧！- 确认数据库服务器可访问
- 验证SSL设置

#### 4. 环境变量缺失
````

Error: JWT_SECRET is not defined

````
**解决方案**:

- 在Deno Deploy项目中设置所有必需的环境变量
- 检查变量名称拼写

### 调试技巧

1. **查看详细日志**:
   ```yaml
   - name: Debug deployment
     run: |
       echo "Project: ${{ env.PROJECT_NAME }}"
       echo "Deno version: $(deno --version)"
````

2. **测试本地构建**:
   ```bash
   deno task build
   deno task start
   ```

3. **验证环境变量**:
   ```bash
   deno eval "console.log(Deno.env.get('DATABASE_URL') ? '✅ DATABASE_URL set' : '❌ DATABASE_URL missing')"
   ```

## 📚 额外资源

- [Deno Deploy文档](https://deno.com/deploy/docs)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [PostgreSQL连接字符串](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Fresh 2部署指南](https://fresh.deno.dev/docs/concepts/deployment)

---

🎉
**完成后，你将拥有一个全自动化的CI/CD流水线，每次推送到main分支都会自动部署到生产环境！**

# 🚀 部署配置指南

这个指南将帮助你完整配置Fresh 2应用的CI/CD部署流程。

## 📋 前置条件

- GitHub账户和仓库
- Deno Deploy账户
- PostgreSQL数据库（生产环境）

## 🔧 步骤1: 设置Deno Deploy

### 1.1 创建Deno Deploy账户

1. 访问 [https://deno.com/deploy](https://deno.com/deploy)
2. 点击 "Sign in with GitHub"
3. 授权Deno Deploy访问你的GitHub账户

### 1.2 生成访问令牌

1. 进入 [Account Settings](https://dash.deno.com/account#access-tokens)
2. 点击 "New Access Token"
3. 填写令牌信息：
   ```
   Description: sams-ai-github-actions
   Permissions: All projects (或选择特定项目)
   ```
4. 点击 "Create"
5. **重要**: 立即复制令牌（只显示一次）

### 1.3 创建项目

1. 访问 [Projects Dashboard](https://dash.deno.com/projects)
2. 点击 "New Project"
3. 项目配置：
   ```
   Name: sams-ai-fresh2
   Deploy method: GitHub Actions
   ```
4. 点击 "Create Project"

## 🔑 步骤2: 配置GitHub Secrets

### 2.1 设置部署令牌

1. 进入GitHub仓库
2. 导航到 `Settings` → `Secrets and variables` → `Actions`
3. 点击 "New repository secret"
4. 添加Secret：
   ```
   Name: DENO_DEPLOY_TOKEN
   Secret: [粘贴步骤1.2中复制的令牌]
   ```

### 2.2 可选：其他平台令牌

如果使用其他部署平台，添加相应的secrets：

```bash
# Railway部署
RAILWAY_TOKEN=your_railway_token

# Fly.io部署  
FLY_API_TOKEN=your_fly_token
```

## 🗄️ 步骤3: 配置生产数据库

### 3.1 创建PostgreSQL数据库

推荐的云PostgreSQL服务：

- **Neon** (免费层): https://neon.tech
- **Supabase** (免费层): https://supabase.com
- **Railway** (付费): https://railway.app
- **AWS RDS**: https://aws.amazon.com/rds/

### 3.2 获取连接字符串

数据库创建后，获取连接字符串格式：

```
postgresql://username:password@host:port/database?sslmode=require
```

### 3.3 在Deno Deploy中设置环境变量

1. 进入你的Deno Deploy项目
2. 点击 "Settings" → "Environment Variables"
3. 添加以下变量：

```bash
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
DB_SSL=true
JWT_SECRET=your_32_character_random_jwt_secret
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=1
DENO_ENV=production
```

## 🔐 步骤4: 生成安全密钥

### 4.1 生成JWT Secret

```bash
# 使用openssl生成32字符随机字符串
openssl rand -base64 32

# 或使用Deno
deno eval "console.log(crypto.getRandomValues(new Uint8Array(32)).reduce((a,b)=>a+String.fromCharCode(b),''))"
```

### 4.2 测试数据库连接

```bash
# 本地测试数据库连接
deno eval "
import { Client } from 'https://deno.land/x/postgres/mod.ts';
const client = new Client('YOUR_DATABASE_URL');
await client.connect();
console.log('✅ Database connection successful');
await client.end();
"
```

## 🏗️ 步骤5: 更新工作流配置

### 5.1 确认项目名称

在 `.github/workflows/deploy.yml` 中确认项目名称与Deno Deploy中创建的项目一致：

```yaml
- name: 🌐 Deploy to Deno Deploy
  uses: denoland/deployctl@v1
  with:
    project: "sams-ai-fresh2" # 确认这个名称正确
    entrypoint: "main.ts"
    root: "."
```

### 5.2 自定义部署配置

如果需要修改部署配置，编辑 `.github/workflows/deploy.yml`：

```yaml
# 修改部署触发条件
on:
  workflow_run:
    workflows: ["Fresh 2 CI/CD Pipeline"]
    types: [completed]
    branches: [main] # 只在main分支部署

  # 手动触发
  workflow_dispatch:
    inputs:
      environment:
        description: "Environment to deploy to"
        required: true
        default: "production"
```

## ✅ 步骤6: 验证部署

### 6.1 触发部署

1. 推送代码到main分支
2. 检查GitHub Actions执行情况
3. 确认Deno Deploy部署状态

### 6.2 测试部署的应用

```bash
# 测试主要端点
curl -f https://sams-ai-fresh2.deno.dev/
curl -f https://sams-ai-fresh2.deno.dev/login
curl -f https://sams-ai-fresh2.deno.dev/signup
```

### 6.3 检查日志

- **GitHub Actions**: 查看工作流执行日志
- **Deno Deploy**: 查看应用运行日志

## 🔧 故障排除

### 常见问题

#### 1. 部署令牌错误

```
Error: Failed to deploy: Invalid access token
```

**解决方案**:

- 检查`DENO_DEPLOY_TOKEN`是否正确设置
- 确认令牌未过期
- 重新生成令牌

#### 2. 项目名称不匹配

```
Error: Project 'project-name' not found
```

**解决方案**:

- 确认Deno Deploy项目名称
- 更新workflow中的项目名称

#### 3. 数据库连接失败

```
Error: Failed to connect to database
```

**解决方案**:

- 检查`DATABASE_URL`格式
- 确认数据库服务器可访问
- 验证SSL设置

#### 4. 环境变量缺失

```
Error: JWT_SECRET is not defined
```

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
   ```

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

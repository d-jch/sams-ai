# 🚀 Fresh 2 CI/CD Pipeline

这个项目使用GitHub
Actions实现全面的CI/CD流程，确保代码质量、测试覆盖率和安全的部署。

## 📋 工作流概览

### 🔄 主要工作流

#### 1. **Fresh 2 CI/CD Pipeline** (`.github/workflows/ci.yml`)

主要的持续集成工作流，在每次push和pull request时触发。

**阶段:**

- **🔍 代码质量检查** - 格式化、linting、类型检查
- **🧪 测试套件** - 单元测试和集成测试（并行矩阵策略）
- **🏗️ 构建和打包** - Vite构建，生成部署artifact
- **🔒 安全审计** - 依赖扫描，安全模式检查
- **🎭 端到端测试** - 完整应用测试
- **✅ 部署就绪检查** - 所有检查通过确认

#### 2. **部署工作流** (`.github/workflows/deploy.yml`)

自动化部署到生产环境，支持手动触发。

**阶段:**

- **🚀 应用部署** - 部署到Deno Deploy或其他平台
- **🔍 部署后测试** - 健康检查、烟雾测试、性能检查
- **📢 通知** - 部署状态通知

### 🎯 触发条件

| 工作流         | 触发条件                               |
| -------------- | -------------------------------------- |
| CI/CD Pipeline | `push` to `main/develop`, PR to `main` |
| Deploy         | CI成功完成 (main分支), 手动触发        |

## 🧪 测试策略

### 测试矩阵

- **单元测试**: 认证工具、中间件逻辑
- **集成测试**: 路由处理、API端点
- **端到端测试**: 完整用户流程

### 测试环境

- PostgreSQL 15 (Alpine)
- 测试专用数据库
- 优化的Argon2参数（CI性能）

## 🔧 配置和环境变量

### 必需的GitHub Secrets

#### 🔑 设置新版 Deno Deploy 集成

1. **创建 Deno Deploy 应用**
   - 访问 [console.deno.com](https://console.deno.com)
   - 使用 GitHub 账户登录

2. **零配置自动部署**
   - ✅ 无需生成访问令牌
   - ✅ 无需设置 GitHub Secrets  
   - ✅ 使用 GitHub App 自动集成
   - ✅ 推送代码自动触发部署

3. **快速部署流程**
   - 创建组织和新应用
   - 连接 GitHub 仓库
   - 框架自动检测为 Fresh
   - 配置环境变量即可完成

#### 🚀 创建 Deno Deploy 应用

1. **访问控制台**
   - 访问 [console.deno.com](https://console.deno.com)
   - 创建组织
   - 点击 "New App"

2. **连接仓库**
   - 选择 GitHub 仓库
   - 框架自动检测为 **Fresh**
   - 入口点自动设置为 `main.ts`
   - 构建命令自动配置

2. **配置项目环境变量** 在项目设置中添加以下环境变量：
   ```bash
   DATABASE_URL=your_production_database_url
   DB_SSL=true
   JWT_SECRET=your_production_jwt_secret_32_chars_long
   ARGON2_MEMORY_COST=65536
   ARGON2_TIME_COST=3
   ARGON2_PARALLELISM=1
   ```

#### 📋 环境变量配置

**Deno Deploy 环境变量** (在应用设置中配置):
```bash
# 数据库配置
DATABASE_URL=postgresql://username:password@host:port/database
DB_SSL=true

# 安全配置
JWT_SECRET=your_production_jwt_secret_32_chars_long

# 性能配置 (可选)
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=1
```

**无需 GitHub Secrets**:
- ✅ 新版 Deno Deploy 使用 GitHub App 集成
- ✅ 无需手动配置部署令牌
- ✅ 环境变量直接在控制台配置

### 环境变量（CI中自动设置）

```yaml
DATABASE_URL: postgresql://postgres:%21Freedog8@localhost:5432/sams_ai_test
DB_SSL: false
JWT_SECRET: ci-test-jwt-secret-32-chars-long
ARGON2_MEMORY_COST: 4096 # 优化CI性能
ARGON2_TIME_COST: 2 # 优化CI性能
ARGON2_PARALLELISM: 1
DENO_ENV: test
```

## 📊 性能优化

### CI优化策略

1. **并行执行**: 测试矩阵并行运行单元和集成测试
2. **缓存**: Deno模块和npm依赖缓存
3. **轻量镜像**: 使用Alpine PostgreSQL镜像
4. **优化参数**: 降低Argon2参数提升CI速度

### 构建优化

- 智能缓存策略
- 构建大小分析
- Artifact保留策略

## 🔒 安全措施

### 安全检查

- 敏感文件扫描
- 依赖漏洞分析
- 代码模式安全检查
- 环境变量验证

### 最佳实践

- 最小权限原则
- 秘钥轮换
- 审计日志
- 安全部署

## 📈 监控和报告

### 覆盖率报告

- 自动生成LCOV覆盖率报告
- Codecov集成（可选）
- 构建分析报告

### 部署报告

- 健康检查状态
- 性能指标
- 部署摘要
- 错误追踪

## 🚀 部署策略

### 支持的平台

- **Deno Deploy** (默认)
- Railway/Fly.io (可配置)
- 自定义Docker部署

### 部署流程

1. 构建验证
2. 安全检查
3. 自动部署
4. 健康检查
5. 烟雾测试
6. 状态通知

## 🔧 本地开发集成

### 运行相同的检查

```bash
# 代码质量检查
deno fmt --check
deno lint
deno check **/*.ts **/*.tsx

# 测试套件
deno task test           # 所有测试
deno task test:auth      # 认证测试
deno task test:middleware # 中间件测试
deno task test:routes    # 路由测试
deno task test:api       # API测试

# 构建验证
deno task build
```

### 测试运行器

```bash
# 使用增强的测试运行器
deno run -A tests/run-tests.ts
deno run -A tests/run-tests.ts auth
```

## 🛠️ 自定义和扩展

### 添加新的检查

1. 在相应的job中添加新步骤
2. 更新测试矩阵（如需要）
3. 配置新的环境变量
4. 更新文档

### 集成其他工具

- 添加代码质量工具 (SonarQube, CodeClimate)
- 集成安全扫描 (Snyk, OWASP)
- 性能监控 (Lighthouse CI)
- 通知系统 (Slack, Discord)

## 📋 故障排除

### 常见问题

- **测试失败**: 检查数据库连接和环境变量
- **构建失败**: 确认依赖版本兼容性
- **部署失败**: 验证部署令牌和权限

### 调试技巧

- 检查GitHub Actions日志
- 本地复现CI环境
- 使用act工具本地运行Actions
- 检查secrets和变量配置

## 📚 相关资源

- [Fresh 2 文档](https://fresh.deno.dev/)
- [Deno Deploy 指南](https://deno.com/deploy/docs)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [PostgreSQL CI 最佳实践](https://docs.github.com/en/actions/using-containerized-services/creating-postgresql-service-containers)

---

💡 **提示**:
这个CI/CD流程确保每次代码变更都经过严格的质量检查、全面测试和安全验证，为生产环境提供可靠的代码交付。

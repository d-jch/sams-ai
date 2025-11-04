# 🚀 Deno Deploy 新版本部署指南

本项目配置为自动部署到 **Deno Deploy 新版本**（console.deno.com），使用 GitHub
App 集成。

## 🎯 部署方式选择

### 方式1：GitHub App 集成（推荐）

- 自动检测 Fresh 2 项目
- 无需配置 token，使用 GitHub App 认证
- 支持预览部署和生产部署
- 完全托管的构建过程

### 方式2：GitHub Actions 部署

- 使用现有的 CI/CD 流水线
- 需要 `id-token: write` 权限
- 支持自定义构建步骤

## 🚀 部署到 Deno Deploy

> **重要说明**: Deno Deploy 分为两个版本，请选择适合的部署方式：
>
> - **新版 Deno Deploy** (console.deno.com) - 推荐，功能更全面
> - **Deploy Classic** (dash.deno.com) - 将逐步被新版替代

### 新版 Deno Deploy (推荐)

**自动 GitHub 集成部署** - 无需 deployctl

1. 访问 [console.deno.com](https://console.deno.com)
2. 创建新的组织和应用
3. 连接你的 GitHub 仓库
4. Deno Deploy 会：
   - 自动检测 Fresh 2 框架
   - 配置构建设置
   - 监听 Git push 自动部署
   - 提供构建状态通知

### Deploy Classic 部署

**手动 deployctl 部署** - 仅用于 Deploy Classic

```bash
# 安装 deployctl (仅 Deploy Classic)
deno install -A --global jsr:@deno/deployctl

# 部署到 Deploy Classic
deployctl deploy --project=your-project-name main.ts
```

## 🔄 部署流程

### 自动部署

- **生产部署**: 推送到 `main` 分支自动触发
- **预览部署**: 创建 Pull Request 自动触发
- **分支部署**: 推送到其他分支创建预览

### 手动部署

```bash
# 使用 deployctl CLI
deno install -A jsr:@deno/deployctl
deployctl deploy --project=sams-ai main.ts
```

## 🏗️ 构建配置

项目已配置 Fresh 2 构建：

```json
{
  "tasks": {
    "dev": "vite",
    "build": "vite build",
    "start": "deno serve -A _fresh/server.js",
    "preview": "deno task build && deno task start"
  }
}
```

构建产物位于 `_fresh/` 目录，包括：

- 客户端资源（CSS、JS）
- 服务器入口文件
- 静态资源

## 🔍 监控和调试

### Deno Deploy 控制台功能

- 实时构建日志
- 应用性能指标
- 错误日志和追踪
- 流量分析

### 本地测试

```bash
# 测试完整构建流程
deno task preview

# 仅测试构建
deno task build

# 检查构建输出
ls -la _fresh/
```

## 🛡️ 安全配置

### 环境变量管理

- 生产环境变量在 Deno Deploy 控制台配置
- 开发环境变量使用 `.env` 文件（不提交到 git）
- 敏感信息使用 "Secret" 类型环境变量

### 权限控制

```typescript
// main.ts 中的权限配置
const app = new App({ root: import.meta.url })
  .use(staticFiles())
  .use(auth()) // 认证中间件
  .use(cors()); // CORS 配置
```

## 📊 性能优化

### Fresh 2 优化

- 自动代码分割
- 服务端渲染（SSR）
- 静态资源压缩
- 智能缓存

### Deno Deploy 优化

- 全球 CDN 分发
- 边缘计算
- 自动缩放
- HTTP/2 支持

## 🆘 故障排除

### 常见问题

#### 构建失败

```bash
# 检查依赖
deno info main.ts

# 本地测试构建
deno task build
```

#### 数据库连接问题

```bash
# 测试连接
deno run -A scripts/test-db.ts

# 检查环境变量
echo $DATABASE_URL
```

#### 权限错误

- 检查 Deno Deploy GitHub App 权限
- 验证仓库访问权限
- 确认环境变量配置

### 调试步骤

1. 检查 Deno Deploy 构建日志
2. 验证本地构建成功
3. 比较环境变量配置
4. 测试数据库连接
5. 检查应用日志

## CI/CD 集成说明

### 部署方式对比

**新版 Deno Deploy (当前配置)**:

- ✅ GitHub App 自动集成
- ✅ 无需 deployctl 配置
- ✅ 自动构建和部署
- ✅ 实时构建日志

**Deploy Classic (旧版)**:

- 🟠 需要 deployctl GitHub Action
- 🟠 手动配置 token
- 🟠 YAML 配置管理
- 🟠 有限功能支持

### GitHub Actions 配置

当前 CI 工作流适配新版 Deno Deploy：

```yaml
# ✅ 正确配置 - 新版 Deno Deploy
deployment-ready:
  steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v4
    - name: Deployment notification
      run: echo "Build ready for Deno Deploy GitHub App"

# ❌ 错误配置 - 仅用于 Deploy Classic
# - uses: denoland/deployctl@v1  # 不要使用
```

## 🔗 相关链接

- [Deno Deploy 文档](https://docs.deno.com/deploy/)
- [Fresh 2 文档](https://fresh.deno.dev/)
- [GitHub Actions 配置](../.github/workflows/ci.yml)
- [数据库迁移脚本](../scripts/migrate.ts)

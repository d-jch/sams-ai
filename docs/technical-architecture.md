# SAMS 技术架构设计

## 核心架构决策

### 技术栈选择

| 层级    | 技术        | 理由                             |
| ------- | ----------- | -------------------------------- |
| 运行时  | Deno 2.x    | TypeScript原生支持，现代安全设计 |
| Web框架 | Fresh 2.x   | Islands架构，零配置SSR           |
| 数据库  | PostgreSQL  | ACID事务，成熟稳定               |
| UI组件  | daisyUI 5.x | 语义化组件，快速原型             |
| 认证    | JWT         | 无状态，易扩展                   |

### 架构模式

- **单体优先**: 50-200用户规模，单体架构成本最优
- **Islands架构**: 服务端渲染 + 选择性客户端交互
- **Repository模式**: 数据访问层抽象，便于测试

## 系统设计

### 项目结构

```
sams/
├── routes/              # Fresh 2 路由 + API
├── islands/             # 客户端交互组件
├── components/          # 服务端UI组件
├── lib/
│   ├── auth/           # JWT认证逻辑
│   ├── database/       # 数据访问层
│   ├── services/       # 业务服务层
│   └── types/          # TypeScript类型
└── static/             # 静态资源
```

### 认证授权设计

```typescript
// 双令牌策略
interface AuthTokens {
  accessToken: string; // 15分钟
  refreshToken: string; // 7天
}

// RBAC权限模型
type UserRole = "researcher" | "technician" | "lab_manager" | "admin";
```

### 数据访问设计

```typescript
// Repository模式
abstract class BaseRepository<T> {
  protected tableName: string;

  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}
```

## Fresh 2 实现模式

### 路由设计

```typescript
// API路由 - routes/api/v1/auth.ts
export const handler = define.handlers({
  async POST(ctx) {
    return jsonResponse({ tokens });
  },
});

// 页面路由 - routes/dashboard.tsx
export default define.page(async (ctx) => {
  return <DashboardPage user={ctx.state.user} />;
});

export const handler = define.handlers(authMiddleware);
```

### 中间件组合

```typescript
// 认证 + 授权中间件链
export const handler = define.handlers(
  authMiddleware, // JWT验证
  requireRole(["admin", "manager"]), // 角色检查
  businessLogicHandler, // 业务逻辑
);
```

## 核心模块

### 认证模块

- **策略**: bcrypt密码哈希 + JWT双令牌
- **权限**: 基于角色的访问控制 (RBAC)
- **安全**: 15分钟访问令牌 + 7天刷新令牌

### 申请管理模块

- **工作流**: 提交 → 审核 → 处理 → 完成
- **状态追踪**: 实时状态更新和历史记录
- **数据验证**: Zod schema校验

### 样品管理模块

- **追踪**: 样品全生命周期管理
- **条码**: 自动生成和识别
- **验证**: 样品信息完整性检查

## 性能与安全

### 性能优化

- **数据库**: 连接池(10最大) + 查询优化
- **前端**: Islands按需加载 + 静态资源缓存
- **API**: JSON响应压缩 + HTTP缓存

### 安全措施

- **传输**: 强制HTTPS + CSP头
- **输入**: 参数化查询 + XSS防护
- **权限**: 细粒度访问控制 + 审计日志

## 部署架构

### 生产环境

```
Internet → Nginx → Fresh App → PostgreSQL
          (SSL)   (Deno 2)    (单实例)
```

### 配置管理

- **环境变量**: JWT密钥、数据库连接
- **容器化**: Docker单容器部署
- **监控**: 健康检查 + 错误日志

## 扩展策略

### 当前架构适用范围

- 用户: 50-200人
- 并发: <50个请求/秒
- 数据: <100GB

### 扩展路径

1. **垂直扩展**: 增加服务器配置
2. **读写分离**: PostgreSQL主从复制
3. **微服务化**: 按业务域拆分服务

---

**版本**: 1.0 | **更新**: 2025-11-06 | **维护**: SAMS技术团队

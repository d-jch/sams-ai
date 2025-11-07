# SAMS 技术规范

## API接口规范

### 基础信息

- **基础URL**: `https://api.sams.example.com/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

### 认证API

#### 用户登录

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "张三",
      "role": "researcher"
    },
    "tokens": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_in": 3600
    }
  }
}
```

#### Token刷新

```http
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

### 核心业务API

#### 申请管理

```http
# 创建申请
POST /requests
{
  "project_name": "项目名称",
  "sequencing_type": "WGS",
  "samples": [
    {
      "name": "样品1",
      "type": "DNA",
      "concentration": 50.5
    }
  ]
}

# 获取申请列表
GET /requests?page=1&limit=20&status=pending

# 获取申请详情
GET /requests/{id}

# 更新申请状态
PATCH /requests/{id}/status
{
  "status": "approved",
  "comment": "审核通过"
}
```

#### 样品管理

```http
# 获取样品列表
GET /samples?request_id={id}

# 更新样品信息
PUT /samples/{id}
{
  "qc_status": "passed",
  "barcode": "SAM123456"
}
```

### 响应格式规范

#### 成功响应

```json
{
  "success": true,
  "data": {
    // 具体数据
  },
  "pagination": { // 列表接口包含
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ]
  }
}
```

### HTTP状态码

- `200` - 成功
- `201` - 创建成功
- `400` - 请求参数错误
- `401` - 未认证
- `403` - 权限不足
- `404` - 资源不存在
- `422` - 数据验证失败
- `500` - 服务器内部错误

## 数据库设计

### 核心表结构

#### 用户表 (users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'researcher',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE user_role AS ENUM ('researcher', 'technician', 'lab_manager', 'admin');
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### 测序申请表 (sequencing_requests)

```sql
CREATE TABLE sequencing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  project_name VARCHAR(200) NOT NULL,
  sequencing_type sequencing_type NOT NULL,
  status request_status NOT NULL DEFAULT 'pending',
  priority priority_level NOT NULL DEFAULT 'normal',
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE sequencing_type AS ENUM ('WGS', 'WES', 'RNA-seq', 'amplicon', 'ChIP-seq');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'in_progress', 'completed', 'cancelled');
CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE INDEX idx_requests_user_id ON sequencing_requests(user_id);
CREATE INDEX idx_requests_status ON sequencing_requests(status);
CREATE INDEX idx_requests_created_at ON sequencing_requests(created_at);
```

#### 样品表 (samples)

```sql
CREATE TABLE samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES sequencing_requests(id),
  name VARCHAR(100) NOT NULL,
  type sample_type NOT NULL,
  barcode VARCHAR(50) UNIQUE,
  concentration DECIMAL(8,2),
  volume DECIMAL(8,2),
  qc_status qc_status DEFAULT 'pending',
  storage_location VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE sample_type AS ENUM ('DNA', 'RNA', 'Protein', 'Cell');
CREATE TYPE qc_status AS ENUM ('pending', 'passed', 'failed', 'retest');

CREATE INDEX idx_samples_request_id ON samples(request_id);
CREATE INDEX idx_samples_barcode ON samples(barcode);
CREATE INDEX idx_samples_qc_status ON samples(qc_status);
```

#### 状态历史表 (request_status_history)

```sql
CREATE TABLE request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES sequencing_requests(id),
  old_status request_status,
  new_status request_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status_history_request_id ON request_status_history(request_id);
CREATE INDEX idx_status_history_created_at ON request_status_history(created_at);
```

### 数据关系图

```
users (1) ──────────────── (N) sequencing_requests
                                      │
                                      │ (1)
                                      │
                                      └── (N) samples
                                      │
                                      │ (1)  
                                      │
                                      └── (N) request_status_history
```

### 查询优化

#### 常用查询索引

```sql
-- 用户申请列表查询
CREATE INDEX idx_requests_user_status ON sequencing_requests(user_id, status);

-- 申请样品联合查询
CREATE INDEX idx_samples_request_status ON samples(request_id, qc_status);

-- 时间范围查询
CREATE INDEX idx_requests_date_range ON sequencing_requests(created_at, status);
```

#### 性能优化策略

- **连接池**: 最大10个连接，避免连接溢出
- **查询优化**: 使用EXPLAIN ANALYZE分析慢查询
- **分页优化**: 使用OFFSET/LIMIT，避免深度分页
- **数据归档**: 定期归档历史数据，保持表大小合理

### 数据安全

#### 权限控制

```sql
-- 应用专用用户
CREATE USER sams_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE sams TO sams_app;
GRANT USAGE ON SCHEMA public TO sams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sams_app;

-- 只读用户（报表查询）
CREATE USER sams_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE sams TO sams_readonly;
GRANT USAGE ON SCHEMA public TO sams_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sams_readonly;
```

#### 备份策略

```bash
# 每日全量备份
pg_dump -h localhost -U postgres -d sams | gzip > sams_backup_$(date +%Y%m%d).sql.gz

# 实时WAL归档
archive_mode = on
archive_command = 'cp %p /backup/archive/%f'
```

## 开发规范

### 数据验证

```typescript
// Zod schema验证
const CreateRequestSchema = z.object({
  project_name: z.string().min(3).max(200),
  sequencing_type: z.enum(["WGS", "WES", "RNA-seq", "16S", "ChIP-seq"]),
  samples: z.array(z.object({
    name: z.string().min(1).max(100),
    type: z.enum(["DNA", "RNA", "Protein", "Cell"]),
    concentration: z.number().positive().optional(),
  })).min(1),
});
```

### 错误处理

```typescript
// 统一错误响应
export class APIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: any[],
  ) {
    super(message);
  }
}

// 使用示例
throw new APIError("VALIDATION_ERROR", "请求参数验证失败", 422, [
  { field: "email", message: "邮箱格式不正确" },
]);
```

### 分页处理

```typescript
// 标准分页响应
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
```

---

**版本**: 1.0 | **更新**: 2025-11-06 | **维护**: SAMS技术团队

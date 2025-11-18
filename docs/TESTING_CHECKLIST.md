# Phase 4 功能测试清单

**测试日期**: 2025-11-10\
**测试环境**: 本地开发服务器 (http://localhost:8000)\
**数据库状态**:

- ✅ 4 个测试用户
- ✅ 6 个引物
- ✅ 2 个 Barcode 试剂盒
- ✅ 28 个 Barcode 序列

---

## 测试账户

| 角色         | 邮箱               | 密码           | 权限                      |
| ------------ | ------------------ | -------------- | ------------------------- |
| 研究员       | researcher@sams.ai | Research123!@# | 创建申请、查看自己的样品  |
| 技术员       | technician@sams.ai | Tech123!@#     | QC、Barcode分配、板图设计 |
| 实验室管理员 | manager@sams.ai    | Manager123!@#  | 审批申请、删除资源        |
| 系统管理员   | admin@sams.ai      | Admin123!@#    | 所有权限                  |

---

## 🧪 测试场景 1: Sanger 测序申请流程

### 1.1 创建 Sanger 申请

- [ ] **登录**: 使用 researcher@example.com
- [ ] **导航**: Dashboard → 新建申请
- [ ] **验证表单动态行为**:
  - [ ] 选择 "Sanger 测序" 后，显示提示信息
  - [ ] "预估成本" 字段应该隐藏（Sanger 按样品数计费）
  - [ ] 备注字段 placeholder 变为 "如：目标基因、扩增片段大小等"
- [ ] **填写表单**:
  ```
  项目名称: Sanger-Test-001
  测序类型: Sanger 测序
  优先级: 正常
  备注: 测试基因克隆验证
  ```
- [ ] **提交**: 点击"创建申请"
- [ ] **预期结果**: 重定向到申请详情页

**✅ 通过标准**:

- 表单提交成功
- 重定向到 `/requests/{id}`
- 页面显示 "测序类型: Sanger测序"

---

### 1.2 添加样品和选择引物

- [ ] **当前页面**: 申请详情页
- [ ] **验证**: 页面显示 "样品管理" 卡片（而非 "样品管理功能即将上线"）
- [ ] **添加第一个样品**:
  - [ ] 点击 "+ 添加样品"
  - [ ] 填写表单:
    ```
    样品名称: Sample-S001
    样品类型: PCR product
    浓度: 80 ng/μL
    体积: 15 μL
    备注: 克隆载体片段
    ```
  - [ ] 点击"添加"
  - [ ] **验证**: 样品出现在列表中，QC状态为 "待检测"

- [ ] **添加第二个样品**:
  ```
  样品名称: Sample-S002
  样品类型: plasmid
  浓度: 120 ng/μL
  体积: 20 μL
  ```

- [ ] **选择引物**:
  - [ ] 为 Sample-S001 选择引物（如: "T7 Promoter"）
  - [ ] **验证**: 下拉框显示引物名称和 Tm 值
  - [ ] 选择后，页面自动更新

**✅ 通过标准**:

- 样品添加成功
- 样品列表显示完整信息
- 引物选择功能正常
- 加载状态指示器工作正常

---

## 🧪 测试场景 2: 技术员 QC 和 Barcode 分配

### 2.1 切换到技术员账户

- [ ] **登出**: 当前账户
- [ ] **登录**: technician@sams.ai
- [ ] **导航**: Dashboard → 查看刚创建的申请

### 2.2 样品质检（QC）

- [ ] **访问**: `/api/v1/samples/{sample-id}/qc` (通过浏览器开发者工具或 curl)
- [ ] **或通过界面**: 如果有 QC 按钮
- [ ] **测试 API**:
  ```bash
  # 获取样品 ID
  curl http://localhost:8000/api/v1/samples?requestId={request-id}

  # 更新 QC 状态
  curl -X PATCH http://localhost:8000/api/v1/samples/{sample-id}/qc \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{
      "qcStatus": "passed",
      "concentration": 85.5,
      "volume": 14.8
    }'
  ```
- [ ] **验证**: QC 状态更新为 "已通过"

### 2.3 Barcode 分配

- [ ] **前提**: 如果样品管理器中有 Barcode 相关界面
- [ ] **或通过 API 测试**:
  ```bash
  # 查看可用试剂盒
  curl http://localhost:8000/api/v1/barcodes/kits

  # 查看试剂盒序列
  curl http://localhost:8000/api/v1/barcodes/kits/{kit-id}/sequences

  # 分配 Barcode
  curl -X POST http://localhost:8000/api/v1/barcodes/assign \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{
      "sampleId": "{sample-id}",
      "barcodeKitId": "{kit-id}",
      "i7Index": "{i7-sequence-id}",
      "i5Index": "{i5-sequence-id}"
    }'
  ```

**✅ 通过标准**:

- QC 状态更新成功
- Barcode 分配 API 返回成功
- 冲突检测工作（重复分配返回 409）

---

## 🧪 测试场景 3: 96 孔板设计器

### 3.1 创建板图（需要多个样品）

- [ ] **准备**: 确保有至少 3-5 个样品
- [ ] **测试手动分配**:
  - [ ] 如果有板图设计器界面，打开它
  - [ ] 选择样品
  - [ ] 点击孔位（如 A01）
  - [ ] 点击"分配到孔位"
  - [ ] **验证**: 孔位显示样品名称，颜色变化

- [ ] **测试自动分配**:
  - [ ] 选择策略: "按行优先"
  - [ ] 点击"自动分配所有样品"
  - [ ] **验证**:
    - 样品按 A01 → A02 → ... 顺序分配
    - 统计面板更新（已分配/空孔位）

### 3.2 测试不同策略

- [ ] **按列优先**: 样品应按 A01 → B01 → C01 ... 分配
- [ ] **跳过边缘**: 样品应从 B02 开始，跳过 A 行、H 行、第 1 列、第 12 列

### 3.3 板图 API 测试

```bash
# 创建板图
curl -X POST http://localhost:8000/api/v1/plates \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "requestId": "{request-id}",
    "plateName": "Test-Plate-001",
    "autoAssignSamples": true,
    "assignmentStrategy": "row-first"
  }'

# 查看板图
curl http://localhost:8000/api/v1/plates/{plate-id}

# 手动分配孔位
curl -X POST http://localhost:8000/api/v1/plates/{plate-id}/wells \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "position": "A01",
    "sampleId": "{sample-id}"
  }'
```

**✅ 通过标准**:

- 板图创建成功
- 自动分配算法正确
- 孔位可视化正确
- 统计数据准确

---

## 🧪 测试场景 4: 引物管理

### 4.1 查看引物库

```bash
curl http://localhost:8000/api/v1/primers
```

- [ ] **验证**: 返回 6 个预置引物
- [ ] **检查字段**: name, sequence, gcContent, tm, purpose

### 4.2 创建自定义引物

```bash
curl -X POST http://localhost:8000/api/v1/primers \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Custom-Primer-001",
    "sequence": "ATGCTAGCTAGCTAGCTA",
    "purpose": "测试引物"
  }'
```

- [ ] **验证**:
  - GC 含量自动计算
  - Tm 值自动计算
  - 返回 201 Created

### 4.3 引物验证测试

```bash
# 测试非法序列（应失败）
curl -X POST http://localhost:8000/api/v1/primers \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Invalid-Primer",
    "sequence": "ATGCXYZ",
    "purpose": "测试"
  }'
```

- [ ] **验证**: 返回 400 错误，提示 "序列只能包含 A, T, G, C"

**✅ 通过标准**:

- CRUD 操作全部成功
- 自动计算功能正常
- 验证规则生效

---

## 🧪 测试场景 5: 权限验证

### 5.1 研究员权限限制

- [ ] **登录**: researcher@sams.ai
- [ ] **尝试分配 Barcode** (应失败):
  ```bash
  curl -X POST http://localhost:8000/api/v1/barcodes/assign \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{...}'
  ```
- [ ] **预期**: 返回 403 Forbidden

### 5.2 技术员权限验证

- [ ] **登录**: technician@sams.ai
- [ ] **可以**: QC、Barcode 分配、板图设计、引物管理
- [ ] **不可以**: 删除申请（需要 lab_manager）

### 5.3 删除操作权限

- [ ] **登录**: manager@sams.ai
- [ ] **删除引物**:
  ```bash
  curl -X DELETE http://localhost:8000/api/v1/primers/{primer-id} \
    -b cookies.txt
  ```
- [ ] **验证**: 成功删除

**✅ 通过标准**:

- 角色权限正确实施
- 未授权操作返回 403
- 权限检查在所有端点生效

---

## 🧪 测试场景 6: 错误处理和边界情况

### 6.1 冲突检测

- [ ] **重复分配 Barcode**:
  - 为同一样品分配两次 Barcode
  - **预期**: 第二次返回 409 Conflict

- [ ] **重复孔位分配**:
  - 将两个样品分配到同一孔位
  - **预期**: 第二次返回 409 Conflict

### 6.2 数据验证

- [ ] **引物序列长度**:
  - 提交 10bp 序列（<18bp）
  - **预期**: 返回 400 错误

- [ ] **孔位格式**:
  - 提交 "Z99" 作为孔位
  - **预期**: 返回 400 错误，提示 "无效的孔位格式"

### 6.3 外键约束

- [ ] **删除已被引用的引物**:
  - 删除已分配给样品的引物
  - **预期**: 返回 400 错误或级联删除（根据设计）

**✅ 通过标准**:

- 所有验证规则生效
- 错误消息清晰明确
- HTTP 状态码正确

---

## 🧪 测试场景 7: UI 交互测试

### 7.1 RequestForm Island

- [ ] **打开**: `/requests/new`
- [ ] **测试动态字段**:
  - [ ] 切换 "WGS" → 显示预估成本字段
  - [ ] 切换 "Sanger" → 隐藏预估成本字段
  - [ ] 提示信息正确显示

- [ ] **测试表单验证**:
  - [ ] 提交空表单 → 浏览器验证提示
  - [ ] 必填字段标记清晰

### 7.2 SangerSampleManager Island

- [ ] **测试添加样品**:
  - [ ] 点击"+ 添加样品"展开表单
  - [ ] 填写并提交
  - [ ] 加载状态显示
  - [ ] 成功后列表更新

- [ ] **测试引物选择**:
  - [ ] 下拉框显示所有引物
  - [ ] 选择后立即保存
  - [ ] 错误处理显示

### 7.3 PlateDesigner Island（如已集成）

- [ ] **孔位点击**:
  - [ ] 点击空孔位 → 选中状态（蓝色高亮）
  - [ ] 点击已占用孔位 → 无变化

- [ ] **颜色编码**:
  - [ ] 空孔: 灰色
  - [ ] 待处理: 黄色
  - [ ] 已上样: 蓝色
  - [ ] 已测序: 绿色

### 7.4 BarcodeManager Island（如已集成）

- [ ] **试剂盒选择**:
  - [ ] 选择单索引试剂盒 → 仅显示 i7 下拉框
  - [ ] 选择双索引试剂盒 → 显示 i7 和 i5 下拉框

- [ ] **分配按钮状态**:
  - [ ] 未选择完整 → 按钮禁用
  - [ ] 选择完整 → 按钮启用

**✅ 通过标准**:

- 所有交互响应迅速
- 状态更新实时
- 错误提示用户友好
- 无 JavaScript 错误（检查浏览器控制台）

---

## 📋 测试总结

### 必测功能（核心路径）

- ✅ Sanger 申请创建
- ✅ 样品添加和引物选择
- ✅ Barcode 分配 API
- ✅ 权限验证

### 可选测试（增强功能）

- ⭕ 96 孔板可视化（如已集成到页面）
- ⭕ Barcode 管理界面（如已集成到页面）
- ⭕ 完整的端到端流程

### 已知限制

- 部分 Island 组件可能需要额外的路由集成
- SampleSheet 生成功能待实现

---

## 🐛 Bug 报告模板

如发现问题，请记录：

```markdown
**Bug 标题**: [简短描述] **重现步骤**: 1. 2. 3.

**预期行为**: **实际行为**: **错误信息**: **浏览器控制台**: **相关文件**:
```

---

**测试人员**: _____________\
**完成日期**: _____________\
**整体评分**: ⭐⭐⭐⭐⭐ (1-5 星)

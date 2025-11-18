# 🎯 Phase 4 快速测试指南

**开发服务器**: http://localhost:5173 ✅ 正在运行\
**预计测试时间**: 10 分钟

---

## 📝 测试账户

```
研究员（创建申请）:
  邮箱: researcher@sams.ai
  密码: Research123!@#

技术员（QC和Barcode）:
  邮箱: technician@sams.ai  
  密码: Tech123!@#
```

---

## ✅ 核心功能测试清单

### 1️⃣ Sanger 申请创建（5分钟） ✅ 已通过

1. **登录**: http://localhost:5173/login
   - 使用研究员账户 ✅

2. **创建申请**: 访问 `/requests/new`
   - 选择 "Sanger 测序" ✅
   - ✅ 检查: "预估成本" 字段消失 ✅
   - ✅ 检查: 显示蓝色提示框 ✅
   - 填写并提交 ✅

3. **查看详情页**:
   - ✅ 检查: 显示 "样品管理" 区域（而非"功能即将上线"）
   - ✅ 检查: 有 "+ 添加样品" 按钮

---

### 2️⃣ 样品管理（3分钟） ✅ 已通过

1. **添加样品**: 点击 "+ 添加样品" ✅
   ```
   样品名称: Test-S001
   样品类型: PCR产物(已纯化)
   浓度: 75
   体积: 20
   ```

2. **验证**:
   - ✅ 样品出现在列表 ✅
   - ✅ QC状态显示 "待检测"（黄色） ✅
   - ✅ 有引物选择下拉框 ✅

---

### 3️⃣ 引物选择（2分钟） ✅ 已通过

1. **选择引物**: 在样品列表中 ✅
   - 点击引物下拉框 ✅
   - ✅ 显示引物和 Tm 值（如 "T7 Promoter (Tm: 58.5°C)"） ✅
   - 选择一个引物 ✅

2. **验证**: 刷新页面 ✅
   - ✅ 引物选择保持 ✅

---

## 🐛 常见问题

**Q: 看不到样品管理器？**\
A: 确认申请类型是 "Sanger 测序"

**Q: 引物下拉框为空？**\
A: 数据库应有 6 个预置引物，检查控制台错误

**Q: 样品添加失败？**\
A: 打开浏览器开发者工具 (F12)，检查 Network 标签

---

## 🎉 测试通过标准

- ✅ 动态表单正常（Sanger vs NGS） ✅
- ✅ 样品可以添加 ✅
- ✅ 引物可以选择 ✅
- ✅ 数据持久化 ✅
- ✅ 无 JavaScript 错误 ✅

---

## 📊 数据库状态检查

```bash
# 快速检查
psql $DATABASE_URL << EOF
SELECT COUNT(*) as users FROM users;
SELECT COUNT(*) as primers FROM primers;
SELECT COUNT(*) as barcode_kits FROM barcode_kits;
SELECT COUNT(*) as barcode_sequences FROM barcode_sequences;
EOF
```

**预期结果**:

- 4 个用户
- 6 个引物
- 2 个 Barcode 试剂盒
- 28 个 Barcode 序列

---

## 📱 浏览器测试步骤

1. **打开浏览器** → http://localhost:5173
2. **登录** → researcher@sams.ai / Research123!@#
3. **新建申请** → 选择 Sanger → 提交
4. **添加样品** → 填写表单 → 添加
5. **选择引物** → 下拉选择 → 自动保存
6. **检查控制台** → 无红色错误 ✅

---

**详细测试清单**: `docs/BROWSER_TESTING_GUIDE.md`\
**API 测试**: `./scripts/test-api-auth.sh`

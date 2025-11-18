# Barcode 系统使用说明

## 概述

Barcode（条形码/索引）系统用于 NGS
高通量测序中的样品标记和后续数据拆分（Demultiplexing）。本系统支持单索引和双索引试剂盒。

---

## 1. Barcode 试剂盒类型

### 1.1 单索引试剂盒 (Single Index)

- **特点**：仅使用 i7 索引（Read 1 索引）
- **适用场景**：样品数量较少（通常 ≤ 12 个）
- **示例**：NEBNext Multiplex Oligos for Illumina (96 Unique Dual Index Primer
  Pairs)

### 1.2 双索引试剂盒 (Dual Index)

- **特点**：同时使用 i7 和 i5 索引（Read 1 + Read 2 索引）
- **适用场景**：样品数量较多（可支持 96 个或更多样品）
- **优势**：通过两个索引组合，大幅增加可区分样品数量，降低索引跳跃（index
  hopping）风险
- **示例**：Illumina Nextera XT Index Kit v2

---

## 2. 工作流程

### 步骤 1: 选择试剂盒

1. 进入 Barcode 管理界面
2. 根据样品数量和预算选择合适的试剂盒：
   - 样品数 ≤ 12：单索引试剂盒
   - 样品数 > 12：双索引试剂盒

### 步骤 2: 分配 Barcode

1. 选择目标样品
2. 选择试剂盒
3. 为单索引试剂盒：选择 i7 索引
4. 为双索引试剂盒：选择 i7 **和** i5 索引
5. 确认分配

### 步骤 3: 验证分配

- 系统会自动检测以下冲突：
  - ✅ 同一样品不能重复分配 Barcode
  - ✅ 同一板内不能有重复的索引组合
  - ✅ 双索引试剂盒必须同时提供 i7 和 i5

### 步骤 4: 生成 SampleSheet

- 所有样品分配完成后，系统可生成 Illumina SampleSheet.csv 文件
- SampleSheet 包含以下信息：
  ```csv
  Sample_ID,Sample_Name,I7_Index_ID,index,I5_Index_ID,index2
  S001,Sample-001,i7_01,ATCACG,i5_01,TTAGGC
  S002,Sample-002,i7_02,CGATGT,i5_02,TGACCA
  ```

---

## 3. 索引组合规则

### 3.1 单索引规则

- ✅ 每个样品必须有唯一的 i7 索引
- ✅ 同一 96 孔板内，i7 索引不能重复

### 3.2 双索引规则

- ✅ 每个样品必须有唯一的 (i7, i5) 组合
- ✅ 推荐使用 Hamming distance ≥ 3 的索引组合（系统内置试剂盒已满足）
- ⚠️ 避免使用索引序列相似度过高的组合

### 3.3 索引跳跃 (Index Hopping)

**问题**：在某些测序仪（如 NovaSeq 使用 patterned flow
cell）上，索引可能在测序过程中"跳跃"到错误样品

**解决方案**：

1. 使用双索引试剂盒（推荐）
2. 使用 Unique Dual Index (UDI) 试剂盒
3. 避免在同一 lane 混合单索引和双索引样品

---

## 4. 数据库内置试剂盒

系统预置了以下试剂盒数据：

| 试剂盒名称             | 类型   | 制造商   | 货号        | 索引数量      |
| ---------------------- | ------ | -------- | ----------- | ------------- |
| NEBNext UDI 96         | Dual   | NEB      | E6440S      | 96 对 (i7+i5) |
| Illumina Nextera XT v2 | Dual   | Illumina | FC-131-2001 | 96 对 (i7+i5) |
| TruSeq DNA CD Indexes  | Single | Illumina | 20019792    | 96 个 (i7)    |
| KAPA UDI Adapter Kit   | Dual   | Roche    | 08861005001 | 96 对 (i7+i5) |

### 添加自定义试剂盒

管理员可通过数据库直接添加新试剂盒：

```sql
-- 添加试剂盒
INSERT INTO barcode_kits (kit_name, kit_type, manufacturer, catalog_number)
VALUES ('Custom Kit', 'dual', 'Vendor', 'CAT123');

-- 添加索引序列
INSERT INTO barcode_sequences (kit_id, barcode_name, "index", sequence, position)
VALUES 
  ('kit-id', 'CustomIdx01', 'i7', 'ATCACGTT', 1),
  ('kit-id', 'CustomIdx01', 'i5', 'AAGGATGA', 1);
```

---

## 5. SampleSheet 生成指南

### 5.1 Illumina SampleSheet 格式

**[Header] 部分**

```csv
[Header]
IEMFileVersion,4
Investigator Name,Lab Manager
Experiment Name,NGS_Run_2025
Date,2025-11-10
Workflow,GenerateFASTQ
Application,FASTQ Only
Assay,TruSeq HT
Description,Sequencing run
Chemistry,Amplicon
```

**[Reads] 部分**

```csv
[Reads]
150
150
```

**[Settings] 部分**

```csv
[Settings]
Adapter,AGATCGGAAGAGCACACGTCTGAACTCCAGTCA
AdapterRead2,AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT
```

**[Data] 部分**

```csv
[Data]
Sample_ID,Sample_Name,Sample_Plate,Sample_Well,I7_Index_ID,index,I5_Index_ID,index2,Sample_Project,Description
S001,Sample-001,Plate1,A01,UDI0001,ATCACG,UDI0001,AAGGATGA,Project1,Control sample
S002,Sample-002,Plate1,A02,UDI0002,CGATGT,UDI0002,AGCTGCTA,Project1,Test sample
```

### 5.2 生成步骤（技术员操作）

1. 确保所有样品已分配 Barcode
2. 确认 96 孔板布局完成
3. 点击"生成 SampleSheet"按钮
4. 下载 `.csv` 文件
5. 上传到测序仪控制软件（如 BaseSpace Sequence Hub）

---

## 6. 常见问题 (FAQ)

### Q1: 如何选择单索引还是双索引？

**A**:

- 样品数 ≤ 12：单索引即可
- 样品数 > 12 或使用 patterned flow cell 测序仪：必须使用双索引

### Q2: 索引序列可以重复使用吗？

**A**:

- ✅ 不同测序批次（不同 flow cell）：可以重复
- ❌ 同一测序批次（同一 lane）：不能重复

### Q3: 什么是 Hamming distance？

**A**: 两个等长序列之间不同位置的数量。例如：

- `ATCG` 和 `ATCC` 的 Hamming distance = 1
- `ATCG` 和 `TGCA` 的 Hamming distance = 4
- **推荐** Hamming distance ≥ 3 以降低测序错误导致的错误分配

### Q4: 索引跳跃 (Index Hopping) 会造成什么影响？

**A**:

- 样品数据会错误分配到其他样品
- 典型错误率：0.1% - 2%
- 对于临床或关键样品：必须使用 UDI (Unique Dual Index)

### Q5: 如何验证 Barcode 分配是否正确？

**A**: 系统会自动检查：

1. 无重复分配
2. 索引组合唯一性
3. 双索引完整性（i7 + i5）

---

## 7. 最佳实践

### ✅ DO（推荐做法）

1. 优先使用双索引试剂盒
2. 使用系统内置的验证试剂盒（已优化 Hamming distance）
3. 记录每次测序的 SampleSheet 和板图
4. 测序前进行质检（QC），确保浓度均一
5. 使用系统自动分配功能（避免手动错误）

### ❌ DON'T（避免做法）

1. 不要在同一 lane 混合单索引和双索引
2. 不要使用相似度过高的索引序列
3. 不要跳过 Barcode 分配验证步骤
4. 不要在同一板内重复使用索引组合

---

## 8. 技术支持

### 联系方式

- 📧 Email: tech-support@example.com
- 📞 电话: 123-456-7890
- 💬 内部 Slack: #sequencing-support

### 参考文档

- [Illumina SampleSheet Guide](https://support.illumina.com)
- [NEB Index Selection Tool](https://nebiocalculator.neb.com)
- [Index Hopping White Paper](https://www.illumina.com/techniques/sequencing/ngs-library-prep/multiplexing/index-hopping.html)

---

**最后更新**: 2025-11-10\
**文档版本**: v1.0\
**维护者**: 实验室管理团队

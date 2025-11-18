#!/bin/bash
# API 认证测试脚本
# 使用技术员账户测试 Phase 4 的 API 端点

set -e

echo "🔧 Phase 4 API 测试（需要认证）"
echo "================================"
echo ""

API_BASE="http://localhost:5173"
COOKIE_FILE="/tmp/sams-cookies.txt"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 清理旧 cookie
rm -f $COOKIE_FILE

# 步骤 1: 登录获取 session
echo -e "${BLUE}📝 步骤 1: 登录（技术员账户）${NC}"
login_response=$(curl -s -c $COOKIE_FILE \
  -X POST "${API_BASE}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "technician@sams.ai",
    "password": "Tech123!@#"
  }')

if echo "$login_response" | grep -q '"user"'; then
  echo -e "${GREEN}✅ 登录成功${NC}"
  echo "$login_response" | head -c 100
  echo "..."
else
  echo -e "${RED}❌ 登录失败${NC}"
  echo "$login_response"
  exit 1
fi
echo ""

# 步骤 2: 测试引物 API
echo -e "${BLUE}📝 步骤 2: 获取引物列表${NC}"
primers_response=$(curl -s -b $COOKIE_FILE "${API_BASE}/api/v1/primers")
primer_count=$(echo "$primers_response" | grep -o '"id"' | wc -l)
echo -e "${GREEN}✅ 找到 ${primer_count} 个引物${NC}"
echo ""

# 步骤 3: 创建引物（技术员权限）
echo -e "${BLUE}📝 步骤 3: 创建自定义引物${NC}"
create_primer=$(curl -s -b $COOKIE_FILE \
  -X POST "${API_BASE}/api/v1/primers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test-Primer-API",
    "sequence": "ATGCTAGCTAGCTAGCTA",
    "purpose": "API测试引物"
  }')

if echo "$create_primer" | grep -q '"id"'; then
  echo -e "${GREEN}✅ 引物创建成功${NC}"
  primer_id=$(echo "$create_primer" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   引物 ID: $primer_id"
else
  echo -e "${YELLOW}⚠️  引物创建失败（可能已存在）${NC}"
fi
echo ""

# 步骤 4: 测试 Barcode 试剂盒
echo -e "${BLUE}📝 步骤 4: 获取 Barcode 试剂盒${NC}"
kits_response=$(curl -s -b $COOKIE_FILE "${API_BASE}/api/v1/barcodes/kits")
kit_count=$(echo "$kits_response" | grep -o '"id"' | wc -l)
echo -e "${GREEN}✅ 找到 ${kit_count} 个试剂盒${NC}"

# 获取第一个试剂盒 ID
kit_id=$(echo "$kits_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ ! -z "$kit_id" ]; then
  echo "   第一个试剂盒 ID: $kit_id"
  
  # 步骤 5: 获取试剂盒序列
  echo ""
  echo -e "${BLUE}📝 步骤 5: 获取试剂盒序列${NC}"
  sequences_response=$(curl -s -b $COOKIE_FILE "${API_BASE}/api/v1/barcodes/kits/${kit_id}/sequences")
  seq_count=$(echo "$sequences_response" | grep -o '"barcodeName"' | wc -l)
  echo -e "${GREEN}✅ 找到 ${seq_count} 个 Barcode 序列${NC}"
fi
echo ""

# 步骤 6: 创建测试申请
echo -e "${BLUE}📝 步骤 6: 创建 Sanger 测试申请${NC}"
request_response=$(curl -s -b $COOKIE_FILE \
  -X POST "${API_BASE}/api/v1/requests" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "API-Test-Sanger-'$(date +%s)'",
    "sequencingType": "sanger",
    "priority": "normal",
    "notes": "API 自动化测试"
  }')

if echo "$request_response" | grep -q '"id"'; then
  echo -e "${GREEN}✅ 申请创建成功${NC}"
  request_id=$(echo "$request_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   申请 ID: $request_id"
  
  # 步骤 7: 添加样品
  echo ""
  echo -e "${BLUE}📝 步骤 7: 为申请添加样品${NC}"
  sample_response=$(curl -s -b $COOKIE_FILE \
    -X POST "${API_BASE}/api/v1/samples" \
    -H "Content-Type: application/json" \
    -d '{
      "requestId": "'"$request_id"'",
      "sampleName": "API-Sample-001",
      "sampleType": "PCR product",
      "concentration": 75.5,
      "volume": 20.0,
      "notes": "API 测试样品"
    }')
  
  if echo "$sample_response" | grep -q '"id"'; then
    echo -e "${GREEN}✅ 样品创建成功${NC}"
    sample_id=$(echo "$sample_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   样品 ID: $sample_id"
    
    # 步骤 8: 更新样品 QC 状态
    echo ""
    echo -e "${BLUE}📝 步骤 8: 更新样品 QC 状态${NC}"
    qc_response=$(curl -s -b $COOKIE_FILE \
      -X PATCH "${API_BASE}/api/v1/samples/${sample_id}/qc" \
      -H "Content-Type: application/json" \
      -d '{
        "qcStatus": "passed",
        "concentration": 80.0,
        "volume": 19.5
      }')
    
    if echo "$qc_response" | grep -q '"qcStatus"'; then
      echo -e "${GREEN}✅ QC 状态更新成功${NC}"
    else
      echo -e "${RED}❌ QC 状态更新失败${NC}"
    fi
    
    # 步骤 9: 分配 Barcode（如果有试剂盒）
    if [ ! -z "$kit_id" ]; then
      echo ""
      echo -e "${BLUE}📝 步骤 9: 分配 Barcode 到样品${NC}"
      
      # 获取第一个 i7 序列
      i7_id=$(echo "$sequences_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
      i5_id=$(echo "$sequences_response" | grep -o '"id":"[^"]*"' | sed -n '2p' | cut -d'"' -f4)
      
      if [ ! -z "$i7_id" ]; then
        barcode_response=$(curl -s -b $COOKIE_FILE \
          -X POST "${API_BASE}/api/v1/barcodes/assign" \
          -H "Content-Type: application/json" \
          -d '{
            "sampleId": "'"$sample_id"'",
            "barcodeKitId": "'"$kit_id"'",
            "i7Index": "'"$i7_id"'",
            "i5Index": "'"$i5_id"'"
          }')
        
        if echo "$barcode_response" | grep -q '"id"'; then
          echo -e "${GREEN}✅ Barcode 分配成功${NC}"
        else
          echo -e "${YELLOW}⚠️  Barcode 分配失败（可能试剂盒类型不匹配）${NC}"
          echo "$barcode_response" | head -c 200
        fi
      fi
    fi
    
    # 步骤 10: 创建 96 孔板
    echo ""
    echo -e "${BLUE}📝 步骤 10: 创建 96 孔板（自动分配）${NC}"
    plate_response=$(curl -s -b $COOKIE_FILE \
      -X POST "${API_BASE}/api/v1/plates" \
      -H "Content-Type: application/json" \
      -d '{
        "requestId": "'"$request_id"'",
        "plateName": "API-Test-Plate",
        "autoAssignSamples": true,
        "assignmentStrategy": "row-first"
      }')
    
    if echo "$plate_response" | grep -q '"id"'; then
      echo -e "${GREEN}✅ 96孔板创建成功${NC}"
      plate_id=$(echo "$plate_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
      echo "   板图 ID: $plate_id"
    else
      echo -e "${YELLOW}⚠️  96孔板创建失败${NC}"
      echo "$plate_response" | head -c 200
    fi
  else
    echo -e "${RED}❌ 样品创建失败${NC}"
  fi
else
  echo -e "${RED}❌ 申请创建失败${NC}"
fi
echo ""

# 测试总结
echo "======================================"
echo -e "${GREEN}✅ API 测试完成！${NC}"
echo ""
echo "📊 测试的 API 端点:"
echo "   - POST /api/auth/login"
echo "   - GET  /api/v1/primers"
echo "   - POST /api/v1/primers"
echo "   - GET  /api/v1/barcodes/kits"
echo "   - GET  /api/v1/barcodes/kits/{id}/sequences"
echo "   - POST /api/v1/requests"
echo "   - POST /api/v1/samples"
echo "   - PATCH /api/v1/samples/{id}/qc"
echo "   - POST /api/v1/barcodes/assign"
echo "   - POST /api/v1/plates"
echo ""
echo "🌐 在浏览器中查看:"
echo "   http://localhost:5173/requests/${request_id:-{request-id}}"
echo ""

# 清理
rm -f $COOKIE_FILE

exit 0

#!/bin/bash
# Phase 4 功能快速测试脚本

echo "🧪 Phase 4 功能测试脚本"
echo "======================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API 基础 URL
API_BASE="http://localhost:5173"

# Cookie 文件
COOKIE_FILE="/tmp/sams-test-cookies.txt"

echo -e "${YELLOW}📌 请确保开发服务器正在运行: deno task dev${NC}"
echo ""

# 测试 1: 检查引物 API
echo "1️⃣  测试引物 API..."
response=$(curl -s -w "%{http_code}" "${API_BASE}/api/v1/primers" -o /tmp/primers.json)
if [ "$response" -eq 200 ]; then
    count=$(jq '.data | length' /tmp/primers.json)
    echo -e "${GREEN}✅ 引物 API 正常 - 找到 ${count} 个引物${NC}"
else
    echo -e "${RED}❌ 引物 API 失败 (HTTP ${response})${NC}"
fi
echo ""

# 测试 2: 检查 Barcode 试剂盒 API
echo "2️⃣  测试 Barcode 试剂盒 API..."
response=$(curl -s -w "%{http_code}" "${API_BASE}/api/v1/barcodes/kits" -o /tmp/kits.json)
if [ "$response" -eq 200 ]; then
    count=$(jq '.data | length' /tmp/kits.json)
    echo -e "${GREEN}✅ Barcode 试剂盒 API 正常 - 找到 ${count} 个试剂盒${NC}"
    
    # 显示试剂盒列表
    echo "   试剂盒列表:"
    jq -r '.data[] | "   - \(.kitName) (\(.kitType))"' /tmp/kits.json
else
    echo -e "${RED}❌ Barcode 试剂盒 API 失败 (HTTP ${response})${NC}"
fi
echo ""

# 测试 3: 检查第一个试剂盒的序列
echo "3️⃣  测试 Barcode 序列 API..."
kit_id=$(jq -r '.data[0].id' /tmp/kits.json)
if [ ! -z "$kit_id" ] && [ "$kit_id" != "null" ]; then
    response=$(curl -s -w "%{http_code}" "${API_BASE}/api/v1/barcodes/kits/${kit_id}/sequences" -o /tmp/sequences.json)
    if [ "$response" -eq 200 ]; then
        count=$(jq '.data.sequences | length' /tmp/sequences.json)
        echo -e "${GREEN}✅ Barcode 序列 API 正常 - 找到 ${count} 个序列${NC}"
    else
        echo -e "${RED}❌ Barcode 序列 API 失败 (HTTP ${response})${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  跳过序列测试（无可用试剂盒）${NC}"
fi
echo ""

# 测试 4: 检查页面可访问性
echo "4️⃣  测试页面可访问性..."

pages=(
    "/login:登录页"
    "/signup:注册页"
    "/requests/new:新建申请页"
)

for page_info in "${pages[@]}"; do
    IFS=':' read -r path name <<< "$page_info"
    response=$(curl -s -w "%{http_code}" -o /dev/null "${API_BASE}${path}")
    if [ "$response" -eq 200 ] || [ "$response" -eq 302 ]; then
        echo -e "${GREEN}✅ ${name} (${path}) 可访问${NC}"
    else
        echo -e "${RED}❌ ${name} (${path}) 不可访问 (HTTP ${response})${NC}"
    fi
done
echo ""

# 测试 5: 数据库连接检查
echo "5️⃣  检查数据库数据..."
echo "   用户数: $(psql $DATABASE_URL -tAc "SELECT COUNT(*) FROM users;")"
echo "   引物数: $(psql $DATABASE_URL -tAc "SELECT COUNT(*) FROM primers;")"
echo "   试剂盒数: $(psql $DATABASE_URL -tAc "SELECT COUNT(*) FROM barcode_kits;")"
echo "   Barcode序列数: $(psql $DATABASE_URL -tAc "SELECT COUNT(*) FROM barcode_sequences;")"
echo ""

# 测试总结
echo "======================================"
echo -e "${GREEN}✅ 基础功能测试完成！${NC}"
echo ""
echo "📖 下一步："
echo "   1. 浏览器访问: http://localhost:8000"
echo "   2. 使用测试账户登录:"
echo "      - 研究员: researcher@example.com / password123"
echo "      - 技术员: technician@example.com / password123"
echo "   3. 参考测试清单: docs/TESTING_CHECKLIST.md"
echo ""

# 清理临时文件
rm -f /tmp/primers.json /tmp/kits.json /tmp/sequences.json

exit 0

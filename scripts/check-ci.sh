#!/bin/bash

# GitHub Actions状态检查脚本
# 使用方法: ./scripts/check-ci.sh

echo "🔍 检查 GitHub Actions 状态..."
echo "================================"

# 检查最新的5个运行
echo "📊 最新运行状态:"
gh run list --limit 5

echo ""
echo "⏱️  正在运行的作业:"
gh run list --status in_progress --limit 3

echo ""
echo "❌ 最近失败的运行:"
gh run list --status failure --limit 3

echo ""
echo "✅ 要查看特定运行详情，使用:"
echo "   gh run view <run-id>"
echo "   gh run view <run-id> --log-failed"

echo ""
echo "🔄 实时监控最新运行:"
echo "   gh run watch"
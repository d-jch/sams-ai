#!/usr/bin/env -S deno run -A
/**
 * 🚀 Fresh 2 应用部署配置指南
 *
 * 支持多种部署平台的配置向导，包括环境变量生成和安全密钥创建。
 * 适用于 Deno Deploy、Railway、Fly.io 等现代部署平台。
 *
 * 使用方法:
 *   deno run -A scripts/setup-deployment.ts
 */

import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const COLORS = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function colorize(color: keyof typeof COLORS, text: string): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function printHeader() {
  console.log(colorize("cyan", "🚀 Fresh 2 应用部署配置指南"));
  console.log("=".repeat(60));
  console.log();
  console.log(colorize("green", "✨ 支持多种部署平台！"));
  console.log("生成安全配置，适用于 Deno Deploy、Railway、Fly.io 等平台");
  console.log("提供完整的环境变量配置和最佳实践指南");
  console.log();
}

function generateSecureSecret(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).slice(0, length);
}

function printStep(step: number, title: string) {
  console.log(colorize("blue", `📋 步骤 ${step}: ${title}`));
  console.log("-".repeat(30));
}

async function promptUser(message: string): Promise<string> {
  console.log(colorize("yellow", `❓ ${message}`));
  console.log(colorize("cyan", "按回车键继续..."));

  const buf = new Uint8Array(1024);
  await Deno.stdin.read(buf);
  return "";
}

function printInstructions() {
  printHeader();

  console.log(
    colorize("green", "这个工具将引导你完成 Fresh 2 应用的部署配置。"),
  );
  console.log("适用于以下部署平台:");
  console.log("• " + colorize("cyan", "Deno Deploy") + " - 官方推荐平台");
  console.log("• " + colorize("cyan", "Railway") + " - 简单易用的云平台");
  console.log("• " + colorize("cyan", "Fly.io") + " - 全球边缘部署");
  console.log("• " + colorize("cyan", "其他支持 Deno 的平台"));
  console.log();
  console.log("你需要准备:");
  console.log("• GitHub 账户和仓库");
  console.log("• 选择的部署平台账户");
  console.log("• PostgreSQL 数据库");
  console.log();
}

function printDeployGuide() {
  printStep(1, "选择部署平台");

  console.log(colorize("green", "🚀 推荐部署平台:"));
  console.log();

  console.log(colorize("yellow", "1️⃣ Deno Deploy (推荐)"));
  console.log("• 访问: " + colorize("cyan", "https://console.deno.com"));
  console.log("• 零配置 GitHub 集成");
  console.log("• 全球 CDN 分发");
  console.log("• 自动 HTTPS");
  console.log();

  console.log(colorize("yellow", "2️⃣ Railway"));
  console.log("• 访问: " + colorize("cyan", "https://railway.app"));
  console.log("• 简单的数据库集成");
  console.log("• 一键部署");
  console.log();

  console.log(colorize("yellow", "3️⃣ Fly.io"));
  console.log("• 访问: " + colorize("cyan", "https://fly.io"));
  console.log("• 全球边缘部署");
  console.log("• Docker 容器支持");
  console.log();

  console.log(colorize("cyan", "💡 通用部署步骤:"));
  console.log("1. 推送代码到 GitHub");
  console.log("2. 连接 GitHub 仓库到部署平台");
  console.log("3. 设置环境变量 (见下方配置)");
  console.log("4. 配置 PostgreSQL 数据库");
  console.log("5. 部署并验证");
  console.log();
}

function generateSecrets() {
  printStep(2, "生成安全密钥");

  const jwtSecret = generateSecureSecret(32);

  console.log(colorize("green", "✅ 为你生成的安全密钥:"));
  console.log();
  console.log(colorize("bold", "JWT_SECRET:"));
  console.log(colorize("cyan", jwtSecret));
  console.log();

  console.log(colorize("yellow", "📋 请将这个密钥保存到安全的地方!"));
  console.log("你需要将它添加到Deno Deploy项目的环境变量中。");
  console.log();
}

function printEnvironmentVariables() {
  printStep(3, "配置环境变量");

  console.log("在你选择的部署平台中设置以下环境变量:");
  console.log("(通常在 Settings → Environment Variables 或类似选项中)");
  console.log();

  const envVars = [
    {
      name: "DATABASE_URL",
      value:
        "postgresql://username:password@host:port/database?sslmode=require",
      description: "生产数据库连接字符串",
    },
    { name: "DB_SSL", value: "true", description: "启用SSL连接" },
    {
      name: "JWT_SECRET",
      value: "[使用步骤2生成的密钥]",
      description: "JWT签名密钥",
    },
    {
      name: "ARGON2_MEMORY_COST",
      value: "65536",
      description: "Argon2内存成本",
    },
    { name: "ARGON2_TIME_COST", value: "3", description: "Argon2时间成本" },
    { name: "ARGON2_PARALLELISM", value: "1", description: "Argon2并行度" },
  ];

  for (const env of envVars) {
    console.log(colorize("cyan", `${env.name}:`));
    console.log(`  值: ${colorize("yellow", env.value)}`);
    console.log(`  说明: ${env.description}`);
    console.log();
  }
}

function printDatabaseSetup() {
  printStep(4, "数据库设置与迁移");

  console.log(colorize("green", "📋 数据库配置流程:"));
  console.log();

  console.log("1. " + colorize("cyan", "选择 PostgreSQL 云服务:"));
  console.log(
    "   • " + colorize("cyan", "Neon") + " (免费层): https://neon.tech",
  );
  console.log(
    "   • " + colorize("cyan", "Supabase") + " (免费层): https://supabase.com",
  );
  console.log(
    "   • " + colorize("cyan", "Railway") + " (付费): https://railway.app",
  );
  console.log(
    "   • " + colorize("cyan", "AWS RDS") +
      " (付费): https://aws.amazon.com/rds/",
  );
  console.log();

  console.log("2. " + colorize("cyan", "获取数据库连接字符串"));
  console.log("   格式: postgresql://user:password@host:port/database");
  console.log();

  console.log(
    "3. " + colorize("cyan", "运行数据库迁移") + colorize("yellow", " (重要!)"),
  );
  console.log("   在部署前，需要手动创建数据库表结构:");
  console.log(
    colorize("green", "   DATABASE_URL='your_db_url' deno task db:migrate"),
  );
  console.log();
  console.log("   💡 注意: 迁移是幂等的，可以安全地重复执行");
  console.log();

  console.log("4. " + colorize("cyan", "设置环境变量"));
  console.log("   将数据库连接字符串设置到平台的 DATABASE_URL 环境变量中");
  console.log();

  console.log(colorize("yellow", "⚠️ 重要提示:"));
  console.log("• 数据库迁移必须在部署前手动执行");
  console.log("• 确保数据库用户有 CREATE 和 INSERT 权限");
  console.log("• 生产数据库建议启用 SSL/TLS 连接");
  console.log();
}

function printCompletion() {
  console.log("=".repeat(50));
  console.log(colorize("green", "🎉 配置指南完成!"));
  console.log();
  console.log("📚 更多详细信息请查看:");
  console.log(
    "• " + colorize("cyan", "docs/DEPLOYMENT.md") + " - 详细部署指南",
  );
  console.log(
    "• " + colorize("cyan", ".github/README.md") + " - CI/CD流程说明",
  );
  console.log();
  console.log(colorize("yellow", "💡 提示: 确保所有密钥都保存在安全的地方!"));
}

async function main() {
  printInstructions();

  printDeployGuide();

  await promptUser("准备设置环境变量了吗？");

  generateSecrets();
  printEnvironmentVariables();
  printDatabaseSetup();
  printCompletion();
}

if (import.meta.main) {
  await main();
}

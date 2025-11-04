#!/usr/bin/env -S deno run -A
/**
 * 🚀 Fresh 2 新版 Deno Deploy 部署指南
 *
 * 新版 Deno Deploy 使用 GitHub App 集成，无需复杂配置！
 * 这个脚本提供快速部署指南和环境变量生成。
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
  console.log(colorize("cyan", "🚀 Fresh 2 新版 Deno Deploy 部署指南"));
  console.log("=".repeat(60));
  console.log();
  console.log(colorize("green", "✨ 零配置自动部署！"));
  console.log("新版 Deno Deploy 使用 GitHub App 集成，无需手动配置 token");
  console.log("推送代码到 GitHub 即可自动部署到全球 CDN");
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

  console.log(colorize("green", "这个工具将引导你完成Fresh 2应用的部署配置。"));
  console.log("你需要准备以下账户和信息:");
  console.log("• GitHub账户和仓库访问权限");
  console.log("• Deno Deploy账户");
  console.log("• PostgreSQL数据库（生产环境）");
  console.log();
}

function printDeployGuide() {
  printStep(1, "新版 Deno Deploy 快速部署");

  console.log(colorize("green", "🚀 零配置自动部署流程:"));
  console.log();
  console.log("1. 推送代码到 GitHub");
  console.log("2. 访问 " + colorize("cyan", "https://console.deno.com"));
  console.log("3. 创建组织 (Organization)");
  console.log("4. 创建新应用 (New App)");
  console.log("5. 连接 GitHub 仓库");
  console.log("6. 框架自动检测为 " + colorize("yellow", "Fresh"));
  console.log("7. 入口点自动设置为 " + colorize("yellow", "main.ts"));
  console.log("8. 配置生产环境变量");
  console.log("9. 享受自动部署！");
  console.log();
  
  console.log(colorize("cyan", "✨ 优势:"));
  console.log("• 无需配置 GitHub Secrets");
  console.log("• 实时构建日志");
  console.log("• 预览部署支持");
  console.log("• 全球 CDN 分发");
  console.log("• 自动 HTTPS");
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
  printStep(3, "配置 Deno Deploy 环境变量");

  console.log("在你的Deno Deploy项目中设置以下环境变量:");
  console.log("(Settings → Environment Variables)");
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
      value: "[使用步骤3生成的密钥]",
      description: "JWT签名密钥",
    },
    {
      name: "ARGON2_MEMORY_COST",
      value: "65536",
      description: "Argon2内存成本",
    },
    { name: "ARGON2_TIME_COST", value: "3", description: "Argon2时间成本" },
    { name: "ARGON2_PARALLELISM", value: "1", description: "Argon2并行度" },
    { name: "DENO_ENV", value: "production", description: "运行环境" },
  ];

  for (const env of envVars) {
    console.log(colorize("cyan", `${env.name}:`));
    console.log(`  值: ${colorize("yellow", env.value)}`);
    console.log(`  说明: ${env.description}`);
    console.log();
  }
}

function printDatabaseSetup() {
  printStep(4, "数据库设置");

  console.log("推荐的PostgreSQL云服务:");
  console.log("• " + colorize("cyan", "Neon") + " (免费层): https://neon.tech");
  console.log(
    "• " + colorize("cyan", "Supabase") + " (免费层): https://supabase.com",
  );
  console.log(
    "• " + colorize("cyan", "Railway") + " (付费): https://railway.app",
  );
  console.log(
    "• " + colorize("cyan", "AWS RDS") + " (付费): https://aws.amazon.com/rds/",
  );
  console.log();

  console.log(
    colorize(
      "yellow",
      "数据库创建后，获取连接字符串并设置到DATABASE_URL环境变量中。",
    ),
  );
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

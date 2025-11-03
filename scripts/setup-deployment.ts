#!/usr/bin/env -S deno run -A
/**
 * 🚀 Fresh 2 部署配置助手
 * 
 * 这个脚本帮助你快速配置CI/CD部署所需的密钥和环境变量
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
  bold: "\x1b[1m"
};

function colorize(color: keyof typeof COLORS, text: string): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function printHeader() {
  console.log(colorize("cyan", "🚀 Fresh 2 部署配置助手"));
  console.log("=".repeat(50));
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

async function setupDenoDeployToken() {
  printStep(1, "设置Deno Deploy访问令牌");
  
  console.log("1. 访问 " + colorize("cyan", "https://dash.deno.com/account#access-tokens"));
  console.log("2. 点击 'New Access Token'");
  console.log("3. 描述: " + colorize("yellow", "sams-ai-github-actions"));
  console.log("4. 权限: " + colorize("yellow", "All projects"));
  console.log("5. 复制生成的令牌");
  console.log();
  
  await promptUser("完成Deno Deploy令牌创建后");
  
  console.log(colorize("green", "✅ 接下来在GitHub仓库中设置Secret:"));
  console.log("• 进入 Settings → Secrets and variables → Actions");
  console.log("• 新建Secret:");
  console.log(colorize("cyan", "  Name: DENO_DEPLOY_TOKEN"));
  console.log(colorize("cyan", "  Secret: [粘贴你的令牌]"));
  console.log();
}

async function setupDenoDeployProject() {
  printStep(2, "创建Deno Deploy项目");
  
  console.log("1. 访问 " + colorize("cyan", "https://dash.deno.com/projects"));
  console.log("2. 点击 'New Project'");
  console.log("3. 项目名称: " + colorize("yellow", "sams-ai-fresh2"));
  console.log("4. 部署方式: " + colorize("yellow", "GitHub Actions"));
  console.log("5. 点击 'Create Project'");
  console.log();
  
  await promptUser("完成Deno Deploy项目创建后");
}

function generateSecrets() {
  printStep(3, "生成安全密钥");
  
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
  printStep(4, "配置Deno Deploy环境变量");
  
  console.log("在你的Deno Deploy项目中设置以下环境变量:");
  console.log("(Settings → Environment Variables)");
  console.log();
  
  const envVars = [
    { name: "DATABASE_URL", value: "postgresql://username:password@host:port/database?sslmode=require", description: "生产数据库连接字符串" },
    { name: "DB_SSL", value: "true", description: "启用SSL连接" },
    { name: "JWT_SECRET", value: "[使用步骤3生成的密钥]", description: "JWT签名密钥" },
    { name: "ARGON2_MEMORY_COST", value: "65536", description: "Argon2内存成本" },
    { name: "ARGON2_TIME_COST", value: "3", description: "Argon2时间成本" },
    { name: "ARGON2_PARALLELISM", value: "1", description: "Argon2并行度" },
    { name: "DENO_ENV", value: "production", description: "运行环境" }
  ];
  
  for (const env of envVars) {
    console.log(colorize("cyan", `${env.name}:`));
    console.log(`  值: ${colorize("yellow", env.value)}`);
    console.log(`  说明: ${env.description}`);
    console.log();
  }
}

function printDatabaseSetup() {
  printStep(5, "设置生产数据库");
  
  console.log("推荐的PostgreSQL云服务:");
  console.log("• " + colorize("cyan", "Neon") + " (免费层): https://neon.tech");
  console.log("• " + colorize("cyan", "Supabase") + " (免费层): https://supabase.com");
  console.log("• " + colorize("cyan", "Railway") + " (付费): https://railway.app");
  console.log("• " + colorize("cyan", "AWS RDS") + " (付费): https://aws.amazon.com/rds/");
  console.log();
  
  console.log(colorize("yellow", "数据库创建后，获取连接字符串并设置到DATABASE_URL环境变量中。"));
  console.log();
}

function printTestingInstructions() {
  printStep(6, "测试部署");
  
  console.log("配置完成后，测试部署:");
  console.log("1. 推送代码到main分支");
  console.log("2. 检查GitHub Actions执行情况");
  console.log("3. 访问你的Deno Deploy应用");
  console.log();
  
  console.log("测试命令:");
  console.log(colorize("cyan", "curl -f https://sams-ai-fresh2.deno.dev/"));
  console.log(colorize("cyan", "curl -f https://sams-ai-fresh2.deno.dev/login"));
  console.log(colorize("cyan", "curl -f https://sams-ai-fresh2.deno.dev/signup"));
  console.log();
}

function printCompletion() {
  console.log("=".repeat(50));
  console.log(colorize("green", "🎉 配置指南完成!"));
  console.log();
  console.log("📚 更多详细信息请查看:");
  console.log("• " + colorize("cyan", "docs/DEPLOYMENT.md") + " - 详细部署指南");
  console.log("• " + colorize("cyan", ".github/README.md") + " - CI/CD流程说明");
  console.log();
  console.log(colorize("yellow", "💡 提示: 确保所有密钥都保存在安全的地方!"));
}

async function main() {
  printInstructions();
  await promptUser("准备好开始配置了吗？");
  
  await setupDenoDeployToken();
  await setupDenoDeployProject();
  generateSecrets();
  printEnvironmentVariables();
  printDatabaseSetup();
  printTestingInstructions();
  printCompletion();
}

if (import.meta.main) {
  await main();
}
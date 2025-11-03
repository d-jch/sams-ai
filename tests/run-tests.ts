#!/usr/bin/env -S deno run -A
/**
 * Test runner with enhanced output and filtering options
 * Usage:
 *   deno run -A tests/run-tests.ts [filter]
 *   
 * Examples:
 *   deno run -A tests/run-tests.ts              # Run all tests
 *   deno run -A tests/run-tests.ts auth         # Run tests matching "auth"
 *   deno run -A tests/run-tests.ts middleware   # Run middleware tests
 */

const COLORS = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m"
};

function colorize(color: keyof typeof COLORS, text: string): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function printBanner() {
  console.log(colorize("blue", "🧪 Fresh 2 Test Runner"));
  console.log("━".repeat(50));
}

async function runTests(filter?: string) {
  printBanner();
  
  const cmd = ["deno", "test", "-A"];
  
  // Add filter if provided
  if (filter) {
    cmd.push("--filter", filter);
    console.log(colorize("yellow", `📋 Filter: ${filter}`));
  }
  
  console.log(colorize("blue", "🚀 Running tests...\n"));
  
  const process = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "inherit",
    stderr: "inherit"
  });
  
  const { success, code } = await process.output();
  
  console.log("\n" + "━".repeat(50));
  
  if (success) {
    console.log(colorize("green", "✅ All tests passed!"));
  } else {
    console.log(colorize("red", `❌ Tests failed (exit code: ${code})`));
  }
  
  return success;
}

async function main() {
  const args = Deno.args;
  const filter = args[0];
  
  // Show help
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
${colorize("bold", "Fresh 2 Test Runner")}

Usage:
  deno run -A tests/run-tests.ts [filter]

Options:
  --help, -h     Show this help message

Examples:
  deno run -A tests/run-tests.ts              # Run all tests
  deno run -A tests/run-tests.ts auth         # Run tests matching "auth"
  deno run -A tests/run-tests.ts middleware   # Run middleware tests
  deno run -A tests/run-tests.ts routes       # Run route tests
  deno run -A tests/run-tests.ts api          # Run API tests

Available test files:
  - tests/auth.test.ts        (Authentication utilities)
  - tests/middleware.test.ts  (Middleware logic)  
  - tests/routes.test.ts      (Route handlers)
  - tests/api-routes.test.ts  (API endpoints)
`);
    return;
  }
  
  const success = await runTests(filter);
  Deno.exit(success ? 0 : 1);
}

if (import.meta.main) {
  await main();
}
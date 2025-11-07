import { define } from "../utils.ts";
import type { User } from "../lib/types.ts";
import ToastMessage from "../islands/ToastMessage.tsx";

export default define.page(function HomePage(props) {
  const user = props.state.user as User | null;
  const message = new URL(props.url).searchParams.get("message");

  return (
    <html>
      <head>
        <title>SAMS - 测序申请管理系统</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/assets/styles.css" />
      </head>
      <body>
        {/* Success Message Toast */}
        {message === "logout_success" && (
          <ToastMessage message="退出登录成功" type="success" duration={1000} />
        )}

        <div class="min-h-screen bg-linear-to-br from-blue-50 via-white to-green-50">
          {/* Navigation */}
          <div class="navbar">
            <div class="flex-1">
              <a class="btn btn-ghost text-xl" href="/">
                🧬 <span class="ml-2">SAMS</span>
              </a>
            </div>
            <div class="flex-none">
              {user
                ? (
                  <div class="dropdown dropdown-end">
                    <div
                      tabIndex={0}
                      role="button"
                      class="btn btn-ghost btn-circle avatar"
                    >
                      <div class="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">
                        {user.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    </div>
                    <ul
                      tabIndex={0}
                      class="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow-lg"
                    >
                      <li class="menu-title">
                        <span>{user.name}</span>
                      </li>
                      <li>
                        <a href="/dashboard">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                          </svg>
                          工作台
                        </a>
                      </li>
                      <li>
                        <form
                          action="/api/auth/logout"
                          method="POST"
                        >
                          <button type="submit" class="flex items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                              />
                            </svg>
                            退出登录
                          </button>
                        </form>
                      </li>
                    </ul>
                  </div>
                )
                : (
                  <div class="flex gap-2">
                    <a href="/login" class="btn btn-ghost">登录</a>
                    <a href="/signup" class="btn btn-outline">注册</a>
                  </div>
                )}
            </div>
          </div>

          {/* Hero Section */}
          <div class="hero min-h-[85vh]">
            <div class="hero-content text-center">
              <div class="max-w-4xl">
                <div class="flex justify-center mb-6">
                  <div class="text-8xl">🧬</div>
                </div>
                <h1 class="text-5xl md:text-6xl font-bold mb-4">
                  <span class="bg-linear-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                    测序申请管理系统
                  </span>
                </h1>
                <h2 class="text-2xl md:text-3xl font-semibold text-base-content/70 mb-6">
                  Sequencing Application Management System
                </h2>

                {user
                  ? (
                    <div class="space-y-4">
                      <div class="alert alert-success max-w-md mx-auto">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="stroke-current shrink-0 h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>欢迎回来，{user.name}！</span>
                      </div>
                      <a href="/dashboard" class="btn btn-primary btn-lg">
                        进入工作台
                      </a>
                    </div>
                  ):<> </>}
              </div>
            </div>
          </div>

          {/* Features */}
          <div class="bg-base-100 py-20">
            <div class="container mx-auto px-4">
              <h2 class="text-4xl font-bold text-center mb-4">核心功能</h2>
              <p class="text-center text-base-content/70 mb-12 max-w-2xl mx-auto">
                全面覆盖测序实验室管理流程，提升工作效率，降低错误率
              </p>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
                  <div class="card-body text-center">
                    <div class="text-5xl mb-4">📝</div>
                    <h3 class="card-title justify-center text-lg">
                      测序申请管理
                    </h3>
                    <p class="text-sm text-base-content/70">
                      在线提交、审核流程、状态跟踪，全程数字化管理
                    </p>
                  </div>
                </div>

                <div class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
                  <div class="card-body text-center">
                    <div class="text-5xl mb-4">🧪</div>
                    <h3 class="card-title justify-center text-lg">
                      样品信息管理
                    </h3>
                    <p class="text-sm text-base-content/70">
                      样品追踪、条码管理、质控记录，确保样品可追溯
                    </p>
                  </div>
                </div>

                <div class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
                  <div class="card-body text-center">
                    <div class="text-5xl mb-4">🔄</div>
                    <h3 class="card-title justify-center text-lg">
                      工作流程管理
                    </h3>
                    <p class="text-sm text-base-content/70">
                      多步骤审核、自动化流转、进度可视化管理
                    </p>
                  </div>
                </div>

                <div class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
                  <div class="card-body text-center">
                    <div class="text-5xl mb-4">📊</div>
                    <h3 class="card-title justify-center text-lg">
                      数据统计分析
                    </h3>
                    <p class="text-sm text-base-content/70">
                      报表生成、数据导出、统计分析，支持决策
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Highlights */}
          <div class="bg-linear-to-br from-primary/5 to-secondary/5 py-20">
            <div class="container mx-auto px-4">
              <h2 class="text-4xl font-bold text-center mb-4">技术亮点</h2>
              <p class="text-center text-base-content/70 mb-12 max-w-2xl mx-auto">
                采用现代化技术栈，确保系统安全、稳定、高效运行
              </p>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div class="card bg-base-100 shadow-lg">
                  <div class="card-body">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="text-3xl">🔒</div>
                      <h3 class="card-title text-lg">安全可靠</h3>
                    </div>
                    <ul class="space-y-2 text-sm text-base-content/80">
                      <li>✓ Argon2id 密码加密</li>
                      <li>✓ JWT 双令牌认证</li>
                      <li>✓ 数据库连接加密</li>
                      <li>✓ 细粒度权限控制</li>
                    </ul>
                  </div>
                </div>

                <div class="card bg-base-100 shadow-lg">
                  <div class="card-body">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="text-3xl">⚡</div>
                      <h3 class="card-title text-lg">性能卓越</h3>
                    </div>
                    <ul class="space-y-2 text-sm text-base-content/80">
                      <li>✓ Fresh 2 Islands 架构</li>
                      <li>✓ Deno 2 原生 TypeScript</li>
                      <li>✓ PostgreSQL 数据库</li>
                      <li>✓ 服务端渲染优先</li>
                    </ul>
                  </div>
                </div>

                <div class="card bg-base-100 shadow-lg">
                  <div class="card-body">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="text-3xl">🎨</div>
                      <h3 class="card-title text-lg">体验优秀</h3>
                    </div>
                    <ul class="space-y-2 text-sm text-base-content/80">
                      <li>✓ 现代化界面设计</li>
                      <li>✓ 响应式布局适配</li>
                      <li>✓ TailwindCSS + daisyUI</li>
                      <li>✓ 完善的表单验证</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer class="footer footer-center p-10 bg-base-200 text-base-content">
            <aside>
              <p class="font-bold text-lg">
                测序申请管理系统 (SAMS)
              </p>
              <p class="text-sm text-base-content/70">
                Sequencing Application Management System
              </p>
              <p class="text-sm mt-4">
                基于 Fresh 2 + Deno 2 + PostgreSQL 构建
              </p>
              <p class="text-xs text-base-content/60">
                Copyright © 2025 - All rights reserved
              </p>
            </aside>
          </footer>
        </div>
      </body>
    </html>
  );
});

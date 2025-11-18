import { define } from "../utils.ts";
import { Head } from "fresh/runtime";

export const handler = define.handlers({
  GET(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    // Set page metadata via ctx.state
    ctx.state.title = "控制面板 - 样品测序管理系统";
    ctx.state.description = "查看您的账户信息，管理测序申请和样品";

    // Return empty data object - page will use props.state.user
    return { data: {} };
  },
});

export default define.page<typeof handler>(function DashboardPage(props) {
  const { user } = props.state;

  return (
    <>
      <Head>
        <title>控制面板 - 样品测序管理系统</title>
        <meta
          name="description"
          content="查看您的账户信息，管理测序申请和样品"
        />
      </Head>

      <div className="min-h-screen bg-base-100">
        {/* Navigation */}
        <div className="navbar bg-base-200 shadow-lg">
          <div className="flex-1">
            <a className="btn btn-ghost text-xl" href="/dashboard">Sams AI</a>
          </div>
          <div className="flex-none">
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-circle avatar"
              >
                <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                  {user?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
              </div>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
              >
                <li>
                  <a className="justify-between">
                    Profile
                    <span className="badge">New</span>
                  </a>
                </li>
                <li>
                  <a>Settings</a>
                </li>
                <li>
                  <form
                    action="/api/auth/logout"
                    method="POST"
                    className="w-full"
                  >
                    <button type="submit" className="w-full text-left">
                      Logout
                    </button>
                  </form>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="container mx-auto px-4 py-8">
          <div className="hero bg-base-200 rounded-box">
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h1 className="text-5xl font-bold">Welcome back!</h1>
                <p className="py-6">
                  Hello,{" "}
                  {user?.name}! You're successfully logged in to your dashboard.
                </p>
                <div className="stats shadow">
                  <div className="stat">
                    <div className="stat-title">Account Status</div>
                    <div className="stat-value text-primary">Active</div>
                    <div className="stat-desc">
                      {user?.emailVerified
                        ? "Email verified"
                        : "Email not verified"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            <a
              href="/requests"
              className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow"
            >
              <div className="card-body">
                <h2 className="card-title">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  测序申请管理
                </h2>
                <p>
                  查看和管理测序申请，包括创建新申请、查看申请详情和跟踪申请状态。
                </p>
                <div className="card-actions justify-end">
                  <span className="badge badge-primary">前往</span>
                </div>
              </div>
            </a>

            {/* 样品管理 - 仅对技术员及以上角色显示 */}
            {user?.role !== "researcher" && (
              <a
                href="/samples"
                className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow"
              >
                <div className="card-body">
                  <h2 className="card-title">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                      />
                    </svg>
                    样品管理
                  </h2>
                  <p>
                    管理测序样品信息，包括样品登记、质检状态更新和样品追踪。
                  </p>
                  <div className="card-actions justify-end">
                    <span className="badge badge-secondary">前往</span>
                  </div>
                </div>
              </a>
            )}

            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  角色: {user?.role === "researcher"
                    ? "申请人"
                    : user?.role === "technician"
                    ? "技术员"
                    : user?.role === "lab_manager"
                    ? "实验室管理员"
                    : user?.role === "admin"
                    ? "系统管理员"
                    : "未知"}
                </h2>
                <p>
                  您的账户使用 Argon2id 密码哈希和安全会话管理保护。
                </p>
                <div className="badge badge-success mt-2">账户已激活</div>
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="mt-8">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Account Information</h2>
                <div className="overflow-x-auto">
                  <table className="table">
                    <tbody>
                      <tr>
                        <td className="font-semibold">Email:</td>
                        <td>{user?.email}</td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Name:</td>
                        <td>{user?.name}</td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Email Verified:</td>
                        <td>
                          <div
                            class={`badge ${
                              user?.emailVerified
                                ? "badge-success"
                                : "badge-warning"
                            }`}
                          >
                            {user?.emailVerified ? "Verified" : "Not Verified"}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Member Since:</td>
                        <td>
                          {user?.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : "Unknown"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

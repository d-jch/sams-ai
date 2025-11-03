import { define } from "../utils.ts";
import { requireAuthMiddleware } from "./_middleware.ts";

export const handler = define.handlers({
  GET: requireAuthMiddleware,
});

export default define.page<typeof handler>(function DashboardPage(props) {
  const { user } = props.state;

  return (
    <html>
      <head>
        <title>Dashboard - Sams AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/assets/styles.css" />
      </head>
      <body>
        <div class="min-h-screen bg-base-100">
          {/* Navigation */}
          <div class="navbar bg-base-200 shadow-lg">
            <div class="flex-1">
              <a class="btn btn-ghost text-xl" href="/dashboard">Sams AI</a>
            </div>
            <div class="flex-none">
              <div class="dropdown dropdown-end">
                <div
                  tabIndex={0}
                  role="button"
                  class="btn btn-ghost btn-circle avatar"
                >
                  <div class="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                    {user?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                </div>
                <ul
                  tabIndex={0}
                  class="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
                >
                  <li>
                    <a class="justify-between">
                      Profile
                      <span class="badge">New</span>
                    </a>
                  </li>
                  <li>
                    <a>Settings</a>
                  </li>
                  <li>
                    <form
                      action="/api/auth/logout"
                      method="POST"
                      class="w-full"
                    >
                      <button type="submit" class="w-full text-left">
                        Logout
                      </button>
                    </form>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div class="container mx-auto px-4 py-8">
            <div class="hero bg-base-200 rounded-box">
              <div class="hero-content text-center">
                <div class="max-w-md">
                  <h1 class="text-5xl font-bold">Welcome back!</h1>
                  <p class="py-6">
                    Hello,{" "}
                    {user?.name}! You're successfully logged in to your
                    dashboard.
                  </p>
                  <div class="stats shadow">
                    <div class="stat">
                      <div class="stat-title">Account Status</div>
                      <div class="stat-value text-primary">Active</div>
                      <div class="stat-desc">
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
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <div class="card bg-base-200 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Secure Authentication
                  </h2>
                  <p>
                    Your account is protected with Argon2id password hashing and
                    secure session management.
                  </p>
                </div>
              </div>

              <div class="card bg-base-200 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Lightning Fast
                  </h2>
                  <p>
                    Built with Fresh 2 and Deno for optimal performance and
                    developer experience.
                  </p>
                </div>
              </div>

              <div class="card bg-base-200 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    Modern UI
                  </h2>
                  <p>
                    Beautiful, accessible interface built with TailwindCSS and
                    daisyUI components.
                  </p>
                </div>
              </div>
            </div>

            {/* User info */}
            <div class="mt-8">
              <div class="card bg-base-200 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">Account Information</h2>
                  <div class="overflow-x-auto">
                    <table class="table">
                      <tbody>
                        <tr>
                          <td class="font-semibold">Email:</td>
                          <td>{user?.email}</td>
                        </tr>
                        <tr>
                          <td class="font-semibold">Name:</td>
                          <td>{user?.name}</td>
                        </tr>
                        <tr>
                          <td class="font-semibold">Email Verified:</td>
                          <td>
                            <div
                              class={`badge ${
                                user?.emailVerified
                                  ? "badge-success"
                                  : "badge-warning"
                              }`}
                            >
                              {user?.emailVerified
                                ? "Verified"
                                : "Not Verified"}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td class="font-semibold">Member Since:</td>
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
      </body>
    </html>
  );
});

import { define } from "../utils.ts";
import type { User } from "../lib/types.ts";

export default define.page(function HomePage(props) {
  const user = props.state.user as User | null;

  return (
    <html>
      <head>
        <title>Sams AI - Lucia-Style Authentication</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/assets/styles.css" />
      </head>
      <body>
        <div class="min-h-screen bg-linear-to-br from-primary/20 to-secondary/20">
          {/* Navigation */}
          <div class="navbar bg-base-100/90 backdrop-blur-sm shadow-lg">
            <div class="flex-1">
              <a class="btn btn-ghost text-xl" href="/">🤖 Sams AI</a>
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
                      <div class="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                        {user.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    </div>
                    <ul
                      tabIndex={0}
                      class="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
                    >
                      <li>
                        <a href="/dashboard">Dashboard</a>
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
                )
                : (
                  <div class="flex gap-2">
                    <a href="/login" class="btn btn-ghost">Login</a>
                    <a href="/signup" class="btn btn-primary">Sign Up</a>
                  </div>
                )}
            </div>
          </div>

          {/* Hero Section */}
          <div class="hero min-h-[80vh]">
            <div class="hero-content text-center">
              <div class="max-w-2xl">
                <h1 class="text-6xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Sequencing Application and Management System (SAMS)
                </h1>
                <p class="py-6 text-lg text-base-content/80">
                  Secure, modern authentication built with Fresh 2, Deno,
                  PostgreSQL, and Argon2. Experience lightning-fast performance
                  with enterprise-grade security.
                </p>

                {user
                  ? (
                    <div class="space-y-4">
                      <div class="alert alert-success">
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
                        <span>
                          Welcome back,{" "}
                          {user.name}! You're successfully authenticated.
                        </span>
                      </div>
                      <a href="/dashboard" class="btn btn-primary btn-lg">
                        Go to Dashboard
                      </a>
                    </div>
                  )
                  : (
                    <div class="flex flex-col sm:flex-row gap-4 justify-center">
                      <a href="/signup" class="btn btn-primary btn-lg">
                        Get Started
                      </a>
                      <a href="/login" class="btn btn-outline btn-lg">
                        Sign In
                      </a>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Features */}
          <div class="bg-base-100/50 backdrop-blur-sm py-16">
            <div class="container mx-auto px-4">
              <h2 class="text-4xl font-bold text-center mb-12">
                Why Choose Our Auth System?
              </h2>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="card bg-base-200/80 shadow-xl">
                  <div class="card-body text-center">
                    <div class="text-4xl mb-4">🔒</div>
                    <h3 class="card-title justify-center">Ultra Secure</h3>
                    <p>
                      Argon2id password hashing, secure session management, and
                      protection against modern attacks.
                    </p>
                  </div>
                </div>

                <div class="card bg-base-200/80 shadow-xl">
                  <div class="card-body text-center">
                    <div class="text-4xl mb-4">⚡</div>
                    <h3 class="card-title justify-center">Lightning Fast</h3>
                    <p>
                      Built on Fresh 2 and Deno for optimal performance, with
                      connection pooling and optimized queries.
                    </p>
                  </div>
                </div>

                <div class="card bg-base-200/80 shadow-xl">
                  <div class="card-body text-center">
                    <div class="text-4xl mb-4">🎨</div>
                    <h3 class="card-title justify-center">Beautiful UI</h3>
                    <p>
                      Modern, accessible interface with TailwindCSS v4 and
                      daisyUI components.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer class="footer footer-center p-10 bg-base-200/50 text-base-content">
            <aside>
              <p>
                Built with ❤️ using Fresh 2, Deno, PostgreSQL, and modern web
                standards.
              </p>
              <p>Copyright © 2025 - Sams AI Authentication System</p>
            </aside>
          </footer>
        </div>
      </body>
    </html>
  );
});

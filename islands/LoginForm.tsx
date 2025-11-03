import { useSignal } from "@preact/signals";

interface LoginFormProps {
  redirectTo?: string;
}

export default function LoginForm(
  { redirectTo = "/dashboard" }: LoginFormProps,
) {
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to dashboard or intended page
        const urlParams = new URLSearchParams(globalThis.location.search);
        const redirect = urlParams.get("redirect") || redirectTo;
        globalThis.location.href = redirect;
      } else {
        error.value = result.message || "Login failed";
      }
    } catch (err) {
      console.error("Login error:", err);
      error.value = "Network error. Please try again.";
    } finally {
      loading.value = false;
    }
  };

  return (
    <div class="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div class="card w-full max-w-md bg-base-200 shadow-xl">
        <div class="card-body">
          <h1 class="card-title text-2xl font-bold text-center mb-6">
            Welcome Back
          </h1>

          {error.value && (
            <div class="alert alert-error mb-4">
              <span>{error.value}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Email</span>
              </label>
              <input
                type="email"
                name="email"
                class="input input-bordered w-full"
                placeholder="Enter your email"
                required
                disabled={loading.value}
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Password</span>
              </label>
              <input
                type="password"
                name="password"
                class="input input-bordered w-full"
                placeholder="Enter your password"
                required
                disabled={loading.value}
              />
              <label class="label">
                <a href="#" class="label-text-alt link link-hover">
                  Forgot password?
                </a>
              </label>
            </div>

            <div class="form-control mt-6">
              <button
                type="submit"
                class="btn btn-primary w-full"
                disabled={loading.value}
              >
                {loading.value && (
                  <span class="loading loading-spinner loading-sm"></span>
                )}
                Sign In
              </button>
            </div>
          </form>

          <div class="divider">OR</div>

          <div class="text-center">
            <p class="text-sm text-base-content/70">
              Don't have an account?{" "}
              <a href="/signup" class="link link-primary">Sign up</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

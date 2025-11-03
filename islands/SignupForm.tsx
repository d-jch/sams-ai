import { useSignal } from "@preact/signals";

interface SignupFormProps {
  redirectTo?: string;
}

export default function SignupForm(
  { redirectTo = "/dashboard" }: SignupFormProps,
) {
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);
  const validationErrors = useSignal<Record<string, string>>({});

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    loading.value = true;
    error.value = null;
    validationErrors.value = {};

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          name: formData.get("name"),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to dashboard or intended page
        const urlParams = new URLSearchParams(globalThis.location.search);
        const redirect = urlParams.get("redirect") || redirectTo;
        globalThis.location.href = redirect;
      } else {
        if (result.errors) {
          validationErrors.value = result.errors;
        } else {
          error.value = result.message || "Signup failed";
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
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
            Create Account
          </h1>

          {error.value && (
            <div class="alert alert-error mb-4">
              <span>{error.value}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Full Name</span>
              </label>
              <input
                type="text"
                name="name"
                class={`input input-bordered w-full ${
                  validationErrors.value.name ? "input-error" : ""
                }`}
                placeholder="Enter your full name"
                required
                disabled={loading.value}
              />
              {validationErrors.value.name && (
                <label class="label">
                  <span class="label-text-alt text-error">
                    {validationErrors.value.name}
                  </span>
                </label>
              )}
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Email</span>
              </label>
              <input
                type="email"
                name="email"
                class={`input input-bordered w-full ${
                  validationErrors.value.email ? "input-error" : ""
                }`}
                placeholder="Enter your email"
                required
                disabled={loading.value}
              />
              {validationErrors.value.email && (
                <label class="label">
                  <span class="label-text-alt text-error">
                    {validationErrors.value.email}
                  </span>
                </label>
              )}
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Password</span>
              </label>
              <input
                type="password"
                name="password"
                class={`input input-bordered w-full ${
                  validationErrors.value.password ? "input-error" : ""
                }`}
                placeholder="Create a strong password"
                required
                disabled={loading.value}
              />
              {validationErrors.value.password && (
                <label class="label">
                  <span class="label-text-alt text-error">
                    {validationErrors.value.password}
                  </span>
                </label>
              )}
              <label class="label">
                <span class="label-text-alt">
                  Must contain uppercase, lowercase, number, and special
                  character
                </span>
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
                Create Account
              </button>
            </div>
          </form>

          <div class="divider">OR</div>

          <div class="text-center">
            <p class="text-sm text-base-content/70">
              Already have an account?{" "}
              <a href="/login" class="link link-primary">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

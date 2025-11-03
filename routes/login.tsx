import { define } from "../utils.ts";
import LoginForm from "../islands/LoginForm.tsx";

export const handler = define.handlers({
  GET(ctx) {
    // Check if user is already authenticated and redirect
    if (ctx.state.user && ctx.state.session) {
      const redirectTo = ctx.url.searchParams.get("redirect") || "/dashboard";
      return new Response(null, {
        status: 302,
        headers: { Location: redirectTo },
      });
    }

    return { data: {} };
  },
});

export default define.page<typeof handler>(function LoginPage() {
  return (
    <html>
      <head>
        <title>Login - Sams AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/assets/styles.css" />
      </head>
      <body>
        <LoginForm />
      </body>
    </html>
  );
});

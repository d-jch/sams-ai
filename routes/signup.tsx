import { define } from "../utils.ts";
import SignupForm from "../islands/SignupForm.tsx";

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

export default define.page<typeof handler>(function SignupPage() {
  return (
    <html>
      <head>
        <title>Sign Up - Sams AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/assets/styles.css" />
      </head>
      <body>
        <SignupForm />
      </body>
    </html>
  );
});

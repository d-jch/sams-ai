import { define } from "../utils.ts";
import { Head } from "fresh/runtime";
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

    // Set page metadata
    ctx.state.title = "登录 - 样品测序管理系统";
    ctx.state.description = "登录到您的账户";

    return { data: {} };
  },
});

export default define.page<typeof handler>(function LoginPage() {
  return (
    <>
      <Head>
        <title>登录 - 样品测序管理系统</title>
        <meta name="description" content="登录到您的账户" />
      </Head>
      <LoginForm />
    </>
  );
});

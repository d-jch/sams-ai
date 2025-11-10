import { define } from "../utils.ts";
import { Head } from "fresh/runtime";
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

    // Set page metadata
    ctx.state.title = "注册 - 样品测序管理系统";
    ctx.state.description = "创建新账户";

    return { data: {} };
  },
});

export default define.page<typeof handler>(function SignupPage() {
  return (
    <>
      <Head>
        <title>注册 - 样品测序管理系统</title>
        <meta name="description" content="创建新账户" />
      </Head>
      <SignupForm />
    </>
  );
});

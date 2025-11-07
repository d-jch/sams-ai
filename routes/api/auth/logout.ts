import { define } from "@/utils.ts";
import { getAuth } from "@/lib/auth.ts";
import { clearSessionCookies } from "@/routes/_middleware.ts";
import type { AuthResponse } from "@/lib/types.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const auth = getAuth();

      // If user has a session, invalidate it
      if (ctx.state.session) {
        await auth.invalidateSession(ctx.state.session.id);
      }

      // Create redirect response to home page with success message
      const response = new Response(null, {
        status: 302,
        headers: {
          Location: "/?message=logout_success",
        },
      });

      // Clear both session and JWT cookies
      return clearSessionCookies(response);
    } catch (error) {
      console.error("Logout error:", error);

      return Response.json(
        {
          success: false,
          message: "Internal server error",
        } satisfies AuthResponse,
        { status: 500 },
      );
    }
  },
});

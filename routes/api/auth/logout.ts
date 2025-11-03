import { define } from "@/utils.ts";
import { getAuth } from "@/lib/auth.ts";
import { clearSessionCookie } from "@/routes/_middleware.ts";
import type { AuthResponse } from "@/lib/types.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const auth = getAuth();

      // If user has a session, invalidate it
      if (ctx.state.session) {
        await auth.invalidateSession(ctx.state.session.id);
      }

      // Create response
      const response = Response.json(
        {
          success: true,
          message: "Logged out successfully",
        } satisfies AuthResponse,
        { status: 200 },
      );

      // Clear session cookie
      return clearSessionCookie(response);
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

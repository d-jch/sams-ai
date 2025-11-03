import { define } from "@/utils.ts";
import type { AuthResponse } from "@/lib/types.ts";

export const handler = define.handlers({
  GET(ctx) {
    try {
      // Return current user from state (set by auth middleware)
      if (ctx.state.user && ctx.state.session) {
        return Response.json(
          {
            success: true,
            user: ctx.state.user,
          } satisfies AuthResponse,
          { status: 200 },
        );
      }

      return Response.json(
        {
          success: false,
          message: "Not authenticated",
        } satisfies AuthResponse,
        { status: 401 },
      );
    } catch (error) {
      console.error("Me endpoint error:", error);

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

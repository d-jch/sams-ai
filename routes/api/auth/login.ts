import { define } from "../../../utils.ts";
import { getAuth } from "../../../lib/auth.ts";
import { sanitizeInput, validateLogin } from "../../../lib/validation.ts";
import { setSessionCookies } from "../../_middleware.ts";
import type { AuthResponse } from "../../../lib/types.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const body = await ctx.req.json();

      // Sanitize inputs
      const email = sanitizeInput(body.email || "").toLowerCase();
      const password = body.password || "";

      // Validate input
      const validation = validateLogin({ email, password });

      if (!validation.isValid) {
        return Response.json(
          {
            success: false,
            message: "Validation failed",
            errors: validation.errors,
          } satisfies AuthResponse,
          { status: 400 },
        );
      }

      const auth = getAuth();

      // Attempt login
      const result = await auth.loginUser({ email, password });

      if (!result) {
        return Response.json(
          {
            success: false,
            message: "Invalid email or password",
            errors: { email: "Invalid credentials" },
          } satisfies AuthResponse,
          { status: 401 },
        );
      }

      const { user, sessionToken, jwt } = result;

      // Create response with user data
      const response = Response.json(
        {
          success: true,
          message: "Login successful",
          user,
        } satisfies AuthResponse,
        { status: 200 },
      );

      // Set both session token and JWT cookies for improved performance
      return setSessionCookies(response, sessionToken, jwt);
    } catch (error) {
      console.error("Login error:", error);

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

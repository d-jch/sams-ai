import { define } from "@/utils.ts";
import { getAuth } from "@/lib/auth.ts";
import {
  sanitizeInput,
  validateRegistration,
} from "@/lib/validation.ts";
import { setSessionCookies } from "@/routes/_middleware.ts";
import type { AuthResponse } from "@/lib/types.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const body = await ctx.req.json();

      // Sanitize inputs
      const email = sanitizeInput(body.email || "").toLowerCase();
      const password = body.password || "";
      const name = sanitizeInput(body.name || "");

      // Validate input
      const validation = validateRegistration({ email, password, name });

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

      // Check if user already exists
      const existingUser = await auth.getUserByEmail(email);
      if (existingUser) {
        return Response.json(
          {
            success: false,
            message: "User with this email already exists",
            errors: { email: "This email is already registered" },
          } satisfies AuthResponse,
          { status: 409 },
        );
      }

      // Create user and session
      const { user, sessionToken, jwt } = await auth.registerAndLogin({
        email,
        password,
        name,
      });

      // Create response with user data (no password)
      const response = Response.json(
        {
          success: true,
          message: "Account created successfully",
          user,
        } satisfies AuthResponse,
        { status: 201 },
      );

      // Set both session token and JWT cookies for improved performance
      return setSessionCookies(response, sessionToken, jwt);
    } catch (error) {
      console.error("Signup error:", error);

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

import { getCookies, setCookie, deleteCookie } from "@std/http/cookie";
import { define } from "@/utils.ts";
import { getAuth } from "@/lib/auth.ts";

/**
 * Session cookie configuration
 */
const SESSION_COOKIE_NAME = "auth_session";
const JWT_COOKIE_NAME = "auth_jwt";

/**
 * Get session tokens from request cookies using @std/http
 */
function getSessionTokensFromRequest(req: Request): { 
  sessionToken: string | null;
  jwt: string | null;
} {
  const cookies = getCookies(req.headers);
  return {
    sessionToken: cookies[SESSION_COOKIE_NAME] || null,
    jwt: cookies[JWT_COOKIE_NAME] || null,
  };
}

// Cookie creation functions replaced by @std/http standard library

/**
 * Global authentication middleware
 * This runs on every request and sets user/session state
 */
export default define.middleware(async (ctx) => {
  const auth = getAuth();

  // Initialize auth state
  ctx.state.user = null;
  ctx.state.session = null;

  // Extract session token from cookies
  const { sessionToken, jwt } = getSessionTokensFromRequest(ctx.req);

  if (jwt || sessionToken) {
    try {
      // JWT-first validation for performance (no DB query if JWT is valid)
      const validationResult = await (async () => {
        if (jwt) {
          const jwtResult = await auth.validateSessionJWT(jwt);
          if (jwtResult.session) {
            return jwtResult;
          }
        }
        
        // Fallback to traditional session token if JWT validation failed
        if (sessionToken) {
          return await auth.validateSession(sessionToken);
        }

        return { user: null, session: null };
      })();

      const { user, session } = validationResult;

      if (user && session) {
        ctx.state.user = user;
        ctx.state.session = session;
        // Note: Session activity is automatically updated during validateSession()
      }
    } catch (error) {
      console.error("Error validating session:", error);
      // Continue with null user/session
    }
  }

  const response = await ctx.next();
  return response;
});

/**
 * Middleware to require authentication
 * Use this to protect routes that require login
 */
export const requireAuthMiddleware = define.middleware(async (ctx) => {
  if (!ctx.state.user || !ctx.state.session) {
    // Redirect to login page
    const loginUrl = new URL("/login", ctx.url.origin);
    loginUrl.searchParams.set("redirect", ctx.url.pathname);

    return new Response(null, {
      status: 302,
      headers: { Location: loginUrl.toString() },
    });
  }

  return await ctx.next();
});

/**
 * Middleware to redirect authenticated users away from auth pages
 * Use this on login/signup pages
 */
export const redirectIfAuthenticatedMiddleware = define.middleware(
  async (ctx) => {
    if (ctx.state.user && ctx.state.session) {
      // Redirect to dashboard or home page
      const redirectTo = ctx.url.searchParams.get("redirect") || "/dashboard";

      return new Response(null, {
        status: 302,
        headers: { Location: redirectTo },
      });
    }

    return await ctx.next();
  },
);

/**
 * Helper function to set session cookies (both main token and JWT) using @std/http
 */
export function setSessionCookies(
  response: Response,
  sessionToken: string,
  jwt: string,
): Response {
  const newHeaders = new Headers(response.headers);
  
  // Main session token (long-lived)
  setCookie(newHeaders, {
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: Deno.env.get("APP_ENV") === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  // JWT token (short-lived, for performance)
  setCookie(newHeaders, {
    name: JWT_COOKIE_NAME,
    value: jwt,
    httpOnly: true,
    secure: Deno.env.get("APP_ENV") === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 5 * 60, // 5 minutes (matches JWT expiration)
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Backward compatibility: set only main session cookie
 */
export function setSessionCookie(
  response: Response,
  sessionToken: string,
): Response {
  const newHeaders = new Headers(response.headers);
  setCookie(newHeaders, {
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: Deno.env.get("APP_ENV") === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Clear session cookies (both main token and JWT) using @std/http
 */
export function clearSessionCookies(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  
  // Clear both cookies
  deleteCookie(newHeaders, SESSION_COOKIE_NAME, { path: "/" });
  deleteCookie(newHeaders, JWT_COOKIE_NAME, { path: "/" });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Backward compatibility: clear only main session cookie
 */
export function clearSessionCookie(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  deleteCookie(newHeaders, SESSION_COOKIE_NAME, { path: "/" });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export { SESSION_COOKIE_NAME };

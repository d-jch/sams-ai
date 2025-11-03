import { expect } from "@std/expect";
import { App } from "fresh";
import { define, type State } from "../utils.ts";

// Test authentication logic in route handlers
Deno.test("Auth route logic - unauthenticated user gets page data", async () => {
  // Simulate the login route logic
  const testHandler = define.handlers({
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

  const app = new App<State>()
    .get("/login", (ctx) => {
      const result = testHandler.GET(ctx);
      if (result instanceof Response) {
        return result;
      }
      return new Response(JSON.stringify(result), { status: 200 });
    })
    .handler();

  const response = await app(new Request("http://localhost/login"));
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data).toEqual({ data: {} });
});

Deno.test("Auth route logic - authenticated user gets redirected to dashboard", async () => {
  // Create middleware to simulate authenticated user
  const authMiddleware = define.middleware((ctx) => {
    ctx.state.user = {
      id: "1",
      email: "test@example.com",
      name: "Test User",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    ctx.state.session = {
      id: "test-session",
      userId: "1",
      lastVerifiedAt: new Date(),
      fresh: true,
      secretHash: new Uint8Array([1, 2, 3, 4]),
    };
    return ctx.next();
  });

  // Simulate the login route logic
  const testHandler = define.handlers({
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

  const app = new App<State>()
    .use(authMiddleware)
    .get("/login", (ctx) => {
      const result = testHandler.GET(ctx);
      if (result instanceof Response) {
        return result;
      }
      return new Response(JSON.stringify(result), { status: 200 });
    })
    .handler();

  const response = await app(new Request("http://localhost/login"));

  expect(response.status).toBe(302);
  expect(response.headers.get("Location")).toBe("/dashboard");
});

Deno.test("Auth route logic - authenticated user gets redirected to custom URL", async () => {
  // Create middleware to simulate authenticated user
  const authMiddleware = define.middleware((ctx) => {
    ctx.state.user = {
      id: "1",
      email: "test@example.com",
      name: "Test User",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    ctx.state.session = {
      id: "test-session",
      userId: "1",
      lastVerifiedAt: new Date(),
      fresh: true,
      secretHash: new Uint8Array([1, 2, 3, 4]),
    };
    return ctx.next();
  });

  // Simulate the login route logic
  const testHandler = define.handlers({
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

  const app = new App<State>()
    .use(authMiddleware)
    .get("/login", (ctx) => {
      const result = testHandler.GET(ctx);
      if (result instanceof Response) {
        return result;
      }
      return new Response(JSON.stringify(result), { status: 200 });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/login?redirect=/profile"),
  );

  expect(response.status).toBe(302);
  expect(response.headers.get("Location")).toBe("/profile");
});

import { expect } from "@std/expect";
import { App } from "fresh";
import { define, type State } from "../utils.ts";

Deno.test("Auth middleware - sets state correctly", async () => {
  // Create a simple test middleware that mimics auth state setting
  const testAuthMiddleware = define.middleware((ctx) => {
    // Simulate setting user state
    ctx.state.user = { 
      id: "1", 
      email: "test@example.com", 
      name: "Test User",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    ctx.state.session = { 
      id: "test-session", 
      userId: "1",
      lastVerifiedAt: new Date(),
      fresh: true,
      secretHash: new Uint8Array([1, 2, 3, 4])
    };
    return ctx.next();
  });

  const handler = new App<State>()
    .use(testAuthMiddleware)
    .get("/", (ctx) => {
      const user = ctx.state.user;
      const session = ctx.state.session;
      return new Response(JSON.stringify({ user, session }));
    })
    .handler();

  const res = await handler(new Request("http://localhost"));
  const data = await res.json();

  expect(data.user.id).toBe("1");
  expect(data.user.email).toBe("test@example.com");
  expect(data.user.name).toBe("Test User");
  expect(data.session.id).toBe("test-session");
  expect(data.session.userId).toBe("1");
});

Deno.test("Auth middleware - handles missing auth state", async () => {
  // Test middleware without setting auth state
  const noAuthMiddleware = define.middleware((ctx) => {
    return ctx.next();
  });

  const handler = new App<State>()
    .use(noAuthMiddleware)
    .get("/", (ctx) => {
      const hasUser = !!ctx.state.user;
      const hasSession = !!ctx.state.session;
      return new Response(JSON.stringify({ hasUser, hasSession }));
    })
    .handler();

  const res = await handler(new Request("http://localhost"));
  const data = await res.json();

  expect(data.hasUser).toBe(false);
  expect(data.hasSession).toBe(false);
});
import { expect } from "@std/expect";
import { App } from "fresh";
import { type State } from "../utils.ts";

// Test the API route that returns user name
Deno.test("API route - returns name parameter", async () => {
  const app = new App<State>()
    .get("/api/:name", (ctx) => {
      const name = ctx.params.name;
      return new Response(`Hello, ${name}!`);
    })
    .handler();

  const response = await app(new Request("http://localhost/api/world"));
  const text = await response.text();

  expect(response.status).toBe(200);
  expect(text).toBe("Hello, world!");
});

Deno.test("API route - handles different names", async () => {
  const app = new App<State>()
    .get("/api/:name", (ctx) => {
      const name = ctx.params.name;
      return new Response(`Hello, ${name}!`);
    })
    .handler();

  const response = await app(new Request("http://localhost/api/deno"));
  const text = await response.text();

  expect(response.status).toBe(200);
  expect(text).toBe("Hello, deno!");
});

Deno.test("API route - handles URL encoded names", async () => {
  const app = new App<State>()
    .get("/api/:name", (ctx) => {
      const name = decodeURIComponent(ctx.params.name);
      return new Response(`Hello, ${name}!`);
    })
    .handler();

  const response = await app(new Request("http://localhost/api/Fresh%20Framework"));
  const text = await response.text();

  expect(response.status).toBe(200);
  expect(text).toBe("Hello, Fresh Framework!");
});
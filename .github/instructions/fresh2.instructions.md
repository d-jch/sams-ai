---
description: Fresh 2
alwaysApply: true
applyTo: "**"
downloadedFrom: https://github.com/denoland/fresh/tree/main/docs
version: 2.1.x
---

# Copilot Instructions

Always follow the official Fresh 2 documentation stored in
`/docs/fresh/latest/`. Never reference or rely on **legacy Fresh 1 syntax**
(e.g. imports from `"fresh/server.ts"` or `"fresh/runtime.ts"`).

---

## 🧩 General Development Rules

1. **Routing**
   - Use file-based routing under the `routes/` directory.
   - Each route can export standard handlers via
     `define.handlers({ GET, POST, ... })` or use `define.page()` for JSX pages.
   - Use `define.middleware()` for middleware instead of legacy `Handlers` or
     `HandlerContext`.

2. **Islands**
   - Client-interactive components must live under `islands/` and be imported
     into server-rendered pages.
   - Islands use Preact 10+ and may import `useSignal` or `useEffect` from
     `@preact/signals` and `preact/hooks`.

3. **Components**
   - Reusable UI components belong in `components/`.
   - Components should be pure functions returning JSX, without direct event
     handlers unless inside islands.

4. **Middleware**
   - Middleware should be placed under `routes/_middleware.ts` and use
     `define.middleware()`.
   - Always call `await ctx.next()` when continuing the request chain.

5. **Server Utilities**
   - Shared logic should live in `utils/` (e.g. `db.ts`).
   - Environment variables are accessed via `Deno.env.get()` and must be defined
     in `.env`.

6. **TypeScript & JSX**
   - Prefer signals and fine-grained reactivity from `@preact/signals` for
     interactivity.

---

## 🎯 Fresh 2 File Route Pattern (CRITICAL)

Fresh 2 uses a **type-safe pattern** to connect handlers and page components.
This is the **preferred pattern** for all route files.

### Handler → Page Data Flow

1. **Handler returns `{ data: {...} }`**
   - Route handlers should return an object with a `data` property
   - This data is automatically passed to the page component
   - TypeScript automatically infers the type

2. **Page uses `define.page<typeof handler>`**
   - The page component is defined using `define.page<typeof handler>`
   - TypeScript automatically infers `props.data` type from handler return
   - No need to manually type the data structure

3. **Access data via `props.data` and state via `props.state`**
   - `props.data`: Contains the data returned from handler's `{ data: {...} }`
   - `props.state`: Contains shared state (e.g., `ctx.state.user` from
     middleware)

### Pattern Example

```tsx routes/example.tsx
import { define } from "../utils.ts";

// 1. Handler returns { data: {...} }
export const handler = define.handlers({
  GET(ctx) {
    const user = ctx.state.user; // From middleware
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    // Return data object - Fresh automatically passes to page
    return { data: { items: ["a", "b", "c"], count: 3 } };
  },

  async POST(ctx) {
    const formData = await ctx.req.formData();
    // Process form...

    // Can return Response for redirects
    return new Response(null, {
      status: 302,
      headers: { Location: "/success" },
    });

    // Or return data for rendering
    // return { data: { error: "Something went wrong" } };
  },
});

// 2. Page uses typeof handler for automatic type inference
export default define.page<typeof handler>(function ExamplePage(props) {
  // 3. Access typed data and state
  const user = props.state.user; // Type: User | null (from middleware)
  const items = props.data.items; // Type: string[] (inferred from handler)
  const count = props.data.count; // Type: number (inferred from handler)

  return (
    <div>
      <h1>Hello {user?.name}</h1>
      <p>Count: {count}</p>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
});
```

### Type Assertions for Complex Data

When handler can return different data shapes (e.g., success vs. error), use
type assertions:

```tsx
export const handler = define.handlers({
  async POST(ctx) {
    try {
      const result = await doSomething();
      return { data: { success: true, result } };
    } catch (error) {
      return { data: { error: "Failed" } };
    }
  },
});

export default define.page<typeof handler>(function Page(props) {
  // Type assertion for union types
  const data = props.data as {
    success?: boolean;
    result?: any;
    error?: string;
  };

  if (data.error) {
    return <div>Error: {data.error}</div>;
  }

  return <div>Success!</div>;
});
```

### Handler Return Types

1. **Data rendering**: `return { data: {...} }`
   - Fresh passes data to page component via `props.data`
   - Automatic type inference with `define.page<typeof handler>`

2. **Redirect**: `return new Response(null, { status: 302, headers: {...} })`
   - Use for navigation after POST or authentication checks
   - Page component won't render when Response is returned

3. **Custom response**: `return ctx.render(<Component />)` or
   `return new
   Response(...)`
   - For special cases like custom headers, status codes
   - Bypasses normal data flow

### Key Rules

- **NEVER** manually type `props.data` - let TypeScript infer from handler
- **ALWAYS** use `define.page<typeof handler>` pattern for type safety
- **Handler first, then page** - export handler before default page export
- **Return `{ data }` from GET handler** for rendering pages with data
- **Return `Response` for redirects** or when you don't need to render
- **Access user/session via `props.state.user`** (set by middleware)

---

## 🧠 Behavioral Notes for Copilot

- Always **prefer composition and modularity** (components, islands, utils).
- When unsure about an API, **reference `/docs/fresh/latest/*/*.md` before
  suggesting code.**
- Avoid mixing old and new Fresh APIs in completions.

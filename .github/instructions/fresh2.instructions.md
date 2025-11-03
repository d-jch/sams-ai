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

## 🧠 Behavioral Notes for Copilot

- Always **prefer composition and modularity** (components, islands, utils).
- When unsure about an API, **reference `/docs/fresh/latest/*/*.md` before
  suggesting code.**
- Avoid mixing old and new Fresh APIs in completions.

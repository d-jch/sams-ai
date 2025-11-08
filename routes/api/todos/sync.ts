import { define } from "../../../utils.ts";
import {
  setTodos,
  type TodoItem,
  type TodoStatus,
} from "../../../lib/todos.ts";

function normalizeStatus(s: unknown): TodoStatus | null {
  if (s === "not-started" || s === "in-progress" || s === "completed") return s;
  return null;
}

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const body = await ctx.req.json();
      // Accept either { todos: TodoItem[] } or { todoList: ToolTodo[] }
      type Incoming = {
        id: unknown;
        title?: unknown;
        description?: unknown;
        status?: unknown;
      };
      let items: Incoming[] | undefined = body?.todos;
      if (!Array.isArray(items) && Array.isArray(body?.todoList)) {
        items = body.todoList;
      }
      if (!Array.isArray(items)) {
        return Response.json({ error: "Invalid payload" }, { status: 400 });
      }

      const todos: TodoItem[] = [];
      for (const it of items) {
        const id = Number((it as Incoming).id);
        const title = String((it as Incoming).title || "").trim();
        const description = String((it as Incoming).description || "").trim();
        const st = normalizeStatus((it as Incoming).status);
        if (!Number.isFinite(id) || !title || !st) continue;
        todos.push({ id, title, description, status: st });
      }

      await setTodos(todos);
      return Response.json({ ok: true, count: todos.length });
    } catch (_e) {
      return Response.json({ error: "Bad Request" }, { status: 400 });
    }
  },
});

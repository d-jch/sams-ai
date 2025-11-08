import { define } from "../../../utils.ts";
import { addTodo, getTodos } from "../../../lib/todos.ts";

export const handler = define.handlers({
  async GET() {
    const todos = await getTodos();
    return Response.json({ todos });
  },
  async POST(ctx) {
    try {
      const body = await ctx.req.json();
      const title = String(body.title || "").trim();
      const description = String(body.description || "").trim();
      if (!title) {
        return Response.json({ error: "标题必填" }, { status: 400 });
      }
      const todo = await addTodo({ title, description, status: "not-started" });
      return Response.json({ todo });
    } catch (_) {
      return Response.json({ error: "请求体错误" }, { status: 400 });
    }
  },
});

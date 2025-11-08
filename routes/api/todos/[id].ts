import { define } from "../../../utils.ts";
import { deleteTodo, getTodos, updateTodo } from "../../../lib/todos.ts";

export const handler = define.handlers({
  async PATCH(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) {
      return Response.json({ error: "无效ID" }, { status: 400 });
    }
    try {
      const body = await ctx.req.json();
      const patch: Partial<
        {
          title: string;
          description: string;
          status: "not-started" | "in-progress" | "completed";
        }
      > = {};
      if (body.status) {
        const status = String(body.status) as
          | "not-started"
          | "in-progress"
          | "completed";
        if (!["not-started", "in-progress", "completed"].includes(status)) {
          return Response.json({ error: "状态无效" }, { status: 400 });
        }
        patch.status = status;
      }
      if (body.title !== undefined) {
        patch.title = String(body.title).trim();
      }
      if (body.description !== undefined) {
        patch.description = String(body.description).trim();
      }
      const updated = await updateTodo(id, patch);
      if (!updated) return Response.json({ error: "未找到" }, { status: 404 });
      return Response.json({ todo: updated });
    } catch (_) {
      return Response.json({ error: "请求体错误" }, { status: 400 });
    }
  },
  async DELETE(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) {
      return Response.json({ error: "无效ID" }, { status: 400 });
    }
    const ok = await deleteTodo(id);
    if (!ok) return Response.json({ error: "未找到" }, { status: 404 });
    return Response.json({ success: true });
  },
  async GET(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) {
      return Response.json({ error: "无效ID" }, { status: 400 });
    }
    const todos = await getTodos();
    const todo = todos.find((t) => t.id === id);
    if (!todo) return Response.json({ error: "未找到" }, { status: 404 });
    return Response.json({ todo });
  },
});

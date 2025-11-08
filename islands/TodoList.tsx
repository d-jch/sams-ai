import { useEffect, useState } from "preact/hooks";
import type { TodoItem, TodoStatus } from "../lib/todos.ts";

interface ApiTodo extends TodoItem {}

export default function TodoList() {
  const [todos, setTodos] = useState<ApiTodo[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/todos");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setTodos(data.todos || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    if (res.ok) {
      setTitle("");
      setDescription("");
      await load();
    } else {
      setError("创建失败");
    }
  }

  async function setStatus(id: number, status: TodoStatus) {
    const res = await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await load();
    } else setError("更新失败");
  }

  async function remove(id: number) {
    if (!confirm("确认删除该任务？")) return;
    const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
    if (res.ok) await load();
    else setError("删除失败");
  }

  return (
    <div class="space-y-6">
      <form onSubmit={add} class="card bg-base-200 shadow">
        <div class="card-body space-y-4">
          <h2 class="card-title">新增任务</h2>
          <input
            class="input input-bordered"
            placeholder="标题"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
          <textarea
            class="textarea textarea-bordered"
            placeholder="描述 (可选)"
            value={description}
            onInput={(e) =>
              setDescription((e.target as HTMLTextAreaElement).value)}
          />
          <div class="card-actions justify-end">
            <button type="submit" class="btn btn-primary">添加</button>
          </div>
        </div>
      </form>

      {error && (
        <div class="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <div class="card bg-base-200 shadow">
        <div class="card-body">
          <h2 class="card-title">当前任务</h2>
          {loading && <span class="loading loading-dots loading-md" />}
          {!loading && todos.length === 0 && (
            <div class="text-sm opacity-60">暂无任务</div>
          )}
          <ul class="space-y-3 mt-4">
            {todos.map((t) => (
              <li
                key={t.id}
                class="border border-base-300 rounded-box p-4 flex flex-col gap-2"
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold">#{t.id} {t.title}</span>
                  <div class="join">
                    <button
                      class={`btn btn-xs join-item ${
                        t.status === "not-started" ? "btn-active" : ""
                      }`}
                      type="button"
                      onClick={() => setStatus(t.id, "not-started")}
                    >
                      未开始
                    </button>
                    <button
                      class={`btn btn-xs join-item ${
                        t.status === "in-progress" ? "btn-active" : ""
                      }`}
                      type="button"
                      onClick={() => setStatus(t.id, "in-progress")}
                    >
                      进行中
                    </button>
                    <button
                      class={`btn btn-xs join-item ${
                        t.status === "completed" ? "btn-active" : ""
                      }`}
                      type="button"
                      onClick={() => setStatus(t.id, "completed")}
                    >
                      已完成
                    </button>
                  </div>
                </div>
                {t.description && (
                  <p class="text-sm opacity-70 leading-snug">{t.description}</p>
                )}
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="btn btn-xs btn-error"
                    onClick={() => remove(t.id)}
                  >
                    删除
                  </button>
                </div>
                <div class="text-xs opacity-50">状态: {t.status}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

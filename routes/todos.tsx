import { define } from "../utils.ts";
import TodoList from "../islands/TodoList.tsx";

export default define.page(function TodosPage() {
  return (
    <html>
      <head>
        <title>TODO 管理</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/assets/styles.css" />
      </head>
      <body>
        <div class="min-h-screen bg-base-100">
          <div class="navbar bg-base-200 shadow">
            <div class="flex-1">
              <a href="/" class="btn btn-ghost text-xl">SAMS</a>
            </div>
            <div class="flex-none">
              <a href="/todos" class="btn btn-primary">TODOs</a>
            </div>
          </div>
          <div class="container mx-auto px-4 py-10 max-w-4xl">
            <h1 class="text-4xl font-bold mb-6">任务看板 / TODO</h1>
            <p class="mb-8 text-base-content/70 text-sm">
              本页展示并可更新当前会话的工作任务。后续对话中的规划会自动同步。
            </p>
            <TodoList />
          </div>
          <footer class="footer footer-center p-6 bg-base-200">
            <aside>
              <p class="text-sm opacity-60">实时同步对话任务列表</p>
            </aside>
          </footer>
        </div>
      </body>
    </html>
  );
});

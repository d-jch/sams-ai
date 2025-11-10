import { define } from "@/utils.ts";

export default define.page(function App(ctx) {
  const title = ctx.state.title ?? "sams-ai";
  const description = ctx.state.description ??
    "基于 Fresh 2 和 Deno 构建的样品测序管理系统";

  return (
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <meta name="description" content={description} />
      </head>
      <body>
        <ctx.Component />
      </body>
    </html>
  );
});

import { define } from "../../utils.ts";

export const handler = define.handlers({
  GET(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    return { data: {} };
  },

  async POST(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    try {
      const formData = await ctx.req.formData();
      const projectName = formData.get("projectName") as string;
      const sequencingType = formData.get("sequencingType") as string;
      const priority = formData.get("priority") as string;
      const estimatedCost = formData.get("estimatedCost") as string;
      const notes = formData.get("notes") as string;

      // 调用 API 创建申请
      const response = await fetch(
        `${ctx.url.origin}/api/v1/requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: ctx.req.headers.get("Cookie") || "",
          },
          body: JSON.stringify({
            projectName,
            sequencingType,
            priority: priority || "normal",
            estimatedCost: estimatedCost
              ? parseFloat(estimatedCost)
              : undefined,
            notes: notes || undefined,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return { data: { error: error.error || "创建申请失败" } };
      }

      const result = await response.json();
      // 创建成功，重定向到详情页
      return new Response(null, {
        status: 302,
        headers: { Location: `/requests/${result.data.id}` },
      });
    } catch (error) {
      console.error("创建申请失败:", error);
      return { data: { error: "创建申请失败，请稍后重试" } };
    }
  },
});

export default define.page<typeof handler>(function NewRequestPage(props) {
  const user = props.state.user;
  const error = (props.data as { error?: string })?.error;

  return (
    <div class="min-h-screen bg-base-200">
      {/* 导航栏 */}
      <div class="navbar bg-base-100 shadow-lg">
        <div class="flex-1">
          <a href="/dashboard" class="btn btn-ghost text-xl">
            样品测序管理系统
          </a>
        </div>
        <div class="flex-none gap-2">
          <span class="text-sm">
            欢迎, {user?.name} ({user?.role})
          </span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" class="btn btn-sm btn-ghost">
              退出
            </button>
          </form>
        </div>
      </div>

      {/* 主内容区 */}
      <div class="container mx-auto p-6">
        <div class="flex items-center mb-6">
          <a href="/requests" class="btn btn-ghost btn-sm mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clip-rule="evenodd"
              />
            </svg>
            返回列表
          </a>
          <h1 class="text-3xl font-bold">新建测序申请</h1>
        </div>

        {/* 错误提示 */}
        {error && (
          <div role="alert" class="alert alert-error mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* 申请表单 */}
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <form method="POST" class="space-y-4">
              {/* 项目名称 */}
              <label class="form-control">
                <div class="label">
                  <span class="label-text font-semibold">
                    项目名称 <span class="text-error">*</span>
                  </span>
                </div>
                <input
                  type="text"
                  name="projectName"
                  placeholder="请输入项目名称"
                  class="input input-bordered"
                  required
                />
              </label>

              {/* 测序类型 */}
              <label class="form-control">
                <div class="label">
                  <span class="label-text font-semibold">
                    测序类型 <span class="text-error">*</span>
                  </span>
                </div>
                <select
                  name="sequencingType"
                  class="select select-bordered"
                  required
                >
                  <option value="">请选择测序类型</option>
                  <option value="WGS">全基因组测序 (WGS)</option>
                  <option value="WES">外显子测序 (WES)</option>
                  <option value="RNA-seq">RNA测序 (RNA-seq)</option>
                  <option value="amplicon">扩增子测序</option>
                  <option value="ChIP-seq">ChIP测序 (ChIP-seq)</option>
                </select>
              </label>

              {/* 优先级 */}
              <label class="form-control">
                <div class="label">
                  <span class="label-text font-semibold">优先级</span>
                </div>
                <select name="priority" class="select select-bordered">
                  <option value="normal">正常</option>
                  <option value="low">低</option>
                  <option value="high">高</option>
                  <option value="urgent">紧急</option>
                </select>
              </label>

              {/* 预估成本 */}
              <label class="form-control">
                <div class="label">
                  <span class="label-text font-semibold">预估成本 (元)</span>
                </div>
                <input
                  type="number"
                  name="estimatedCost"
                  placeholder="请输入预估成本"
                  class="input input-bordered"
                  min="0"
                  step="0.01"
                />
              </label>

              {/* 备注 */}
              <label class="form-control">
                <div class="label">
                  <span class="label-text font-semibold">备注</span>
                </div>
                <textarea
                  name="notes"
                  placeholder="请输入备注信息"
                  class="textarea textarea-bordered h-24"
                />
              </label>

              {/* 提交按钮 */}
              <div class="card-actions justify-end pt-4">
                <a href="/requests" class="btn btn-ghost">
                  取消
                </a>
                <button type="submit" class="btn btn-primary">
                  创建申请
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
});

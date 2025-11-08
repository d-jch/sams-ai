import { define } from "../../utils.ts";
import type {
  PriorityLevel,
  RequestStatus,
  SequencingRequest,
  SequencingType,
} from "../../lib/types.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    try {
      // 获取查询参数
      const url = new URL(ctx.req.url);
      const page = url.searchParams.get("page") || "1";
      const limit = url.searchParams.get("limit") || "10";
      const status = url.searchParams.get("status") || "";
      const sequencingType = url.searchParams.get("sequencingType") || "";
      const priority = url.searchParams.get("priority") || "";

      // 构建 API 查询参数
      const apiParams = new URLSearchParams({ page, limit });
      if (status) apiParams.set("status", status);
      if (sequencingType) apiParams.set("sequencingType", sequencingType);
      if (priority) apiParams.set("priority", priority);

      // 获取申请列表
      const response = await fetch(
        `${ctx.url.origin}/api/v1/requests?${apiParams.toString()}`,
        {
          headers: {
            Cookie: ctx.req.headers.get("Cookie") || "",
          },
        },
      );

      if (!response.ok) {
        throw new Error("获取申请列表失败");
      }

      const result = await response.json();
      return {
        data: {
          requests: result.data || [],
          meta: result.meta || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
          filters: { status, sequencingType, priority },
        },
      };
    } catch (error) {
      console.error("获取申请列表失败:", error);
      return {
        data: {
          requests: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
          filters: { status: "", sequencingType: "", priority: "" },
        },
      };
    }
  },
});

export default define.page<typeof handler>(function RequestsPage(props) {
  const user = props.state.user;
  const requests = props.data.requests;
  const meta = props.data.meta;
  const filters = props.data.filters;

  // 状态映射（中文）
  const statusMap: Record<RequestStatus, string> = {
    pending: "待处理",
    approved: "已批准",
    in_progress: "进行中",
    completed: "已完成",
    cancelled: "已取消",
  };

  // 类型映射（中文）
  const typeMap: Record<SequencingType, string> = {
    "WGS": "全基因组测序",
    "WES": "外显子测序",
    "RNA-seq": "RNA测序",
    "amplicon": "扩增子测序",
    "ChIP-seq": "ChIP测序",
  };

  // 优先级映射（中文）
  const priorityMap: Record<PriorityLevel, string> = {
    low: "低",
    normal: "正常",
    high: "高",
    urgent: "紧急",
  };

  // 状态对应的 badge 颜色
  const statusColorMap: Record<RequestStatus, string> = {
    pending: "badge-warning",
    approved: "badge-info",
    in_progress: "badge-primary",
    completed: "badge-success",
    cancelled: "badge-neutral",
  };

  // 优先级对应的 badge 颜色
  const priorityColorMap: Record<PriorityLevel, string> = {
    low: "badge-neutral",
    normal: "badge-info",
    high: "badge-warning",
    urgent: "badge-error",
  };

  // 构建分页链接
  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", meta.limit.toString());
    if (filters.status) params.set("status", filters.status);
    if (filters.sequencingType) {
      params.set("sequencingType", filters.sequencingType);
    }
    if (filters.priority) params.set("priority", filters.priority);
    return `/requests?${params.toString()}`;
  };

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
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold">测序申请管理</h1>
          <a href="/requests/new" class="btn btn-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            新建申请
          </a>
        </div>

        {/* 过滤器 */}
        <div class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <h2 class="card-title">筛选条件</h2>
            <form method="GET" action="/requests">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">状态</span>
                  </label>
                  <select name="status" class="select select-bordered">
                    <option value="">全部</option>
                    <option
                      value="pending"
                      selected={filters.status === "pending"}
                    >
                      待处理
                    </option>
                    <option
                      value="approved"
                      selected={filters.status === "approved"}
                    >
                      已批准
                    </option>
                    <option
                      value="in_progress"
                      selected={filters.status === "in_progress"}
                    >
                      进行中
                    </option>
                    <option
                      value="completed"
                      selected={filters.status === "completed"}
                    >
                      已完成
                    </option>
                    <option
                      value="cancelled"
                      selected={filters.status === "cancelled"}
                    >
                      已取消
                    </option>
                  </select>
                </div>

                <div class="form-control">
                  <label class="label">
                    <span class="label-text">测序类型</span>
                  </label>
                  <select name="sequencingType" class="select select-bordered">
                    <option value="">全部</option>
                    <option
                      value="WGS"
                      selected={filters.sequencingType === "WGS"}
                    >
                      全基因组测序
                    </option>
                    <option
                      value="WES"
                      selected={filters.sequencingType === "WES"}
                    >
                      外显子测序
                    </option>
                    <option
                      value="RNA-seq"
                      selected={filters.sequencingType === "RNA-seq"}
                    >
                      RNA测序
                    </option>
                    <option
                      value="amplicon"
                      selected={filters.sequencingType === "amplicon"}
                    >
                      扩增子测序
                    </option>
                    <option
                      value="ChIP-seq"
                      selected={filters.sequencingType === "ChIP-seq"}
                    >
                      ChIP测序
                    </option>
                  </select>
                </div>

                <div class="form-control">
                  <label class="label">
                    <span class="label-text">优先级</span>
                  </label>
                  <select name="priority" class="select select-bordered">
                    <option value="">全部</option>
                    <option value="low" selected={filters.priority === "low"}>
                      低
                    </option>
                    <option
                      value="normal"
                      selected={filters.priority === "normal"}
                    >
                      正常
                    </option>
                    <option
                      value="high"
                      selected={filters.priority === "high"}
                    >
                      高
                    </option>
                    <option
                      value="urgent"
                      selected={filters.priority === "urgent"}
                    >
                      紧急
                    </option>
                  </select>
                </div>

                <div class="form-control">
                  <label class="label">
                    <span class="label-text">&nbsp;</span>
                  </label>
                  <button type="submit" class="btn btn-primary">
                    应用筛选
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* 统计信息 */}
        <div class="stats shadow mb-6">
          <div class="stat">
            <div class="stat-title">总记录数</div>
            <div class="stat-value text-primary">{meta.total}</div>
          </div>
          <div class="stat">
            <div class="stat-title">当前页</div>
            <div class="stat-value text-secondary">
              {meta.page} / {meta.totalPages || 1}
            </div>
          </div>
          <div class="stat">
            <div class="stat-title">每页显示</div>
            <div class="stat-value">{meta.limit}</div>
          </div>
        </div>

        {/* 申请列表 */}
        {requests.length === 0
          ? (
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body text-center">
                <p class="text-gray-500">暂无申请记录</p>
                <div class="card-actions justify-center">
                  <a href="/requests/new" class="btn btn-primary">
                    创建第一个申请
                  </a>
                </div>
              </div>
            </div>
          )
          : (
            <>
              <div class="overflow-x-auto">
                <table class="table table-zebra bg-base-100 shadow-xl">
                  <thead>
                    <tr>
                      <th>项目名称</th>
                      <th>测序类型</th>
                      <th>优先级</th>
                      <th>状态</th>
                      <th>创建时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request: SequencingRequest) => (
                      <tr key={request.id}>
                        <td>
                          <span class="font-semibold">
                            {request.projectName}
                          </span>
                        </td>
                        <td>
                          {typeMap[request.sequencingType as SequencingType]}
                        </td>
                        <td>
                          <span
                            class={`badge ${
                              priorityColorMap[
                                request.priority as PriorityLevel
                              ]
                            }`}
                          >
                            {priorityMap[request.priority as PriorityLevel]}
                          </span>
                        </td>
                        <td>
                          <span
                            class={`badge ${
                              statusColorMap[request.status as RequestStatus]
                            }`}
                          >
                            {statusMap[request.status as RequestStatus]}
                          </span>
                        </td>
                        <td>
                          {new Date(request.createdAt).toLocaleDateString(
                            "zh-CN",
                          )}
                        </td>
                        <td>
                          <a
                            href={`/requests/${request.id}`}
                            class="btn btn-sm btn-ghost"
                          >
                            查看详情
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页控件 */}
              {meta.totalPages > 1 && (
                <div class="flex justify-center mt-6">
                  <div class="join">
                    {/* 上一页 */}
                    {meta.page > 1
                      ? (
                        <a
                          href={buildPageUrl(meta.page - 1)}
                          class="join-item btn"
                        >
                          «
                        </a>
                      )
                      : (
                        <button
                          type="button"
                          class="join-item btn btn-disabled"
                        >
                          «
                        </button>
                      )}

                    {/* 页码按钮 */}
                    {Array.from(
                      { length: Math.min(5, meta.totalPages) },
                      (_, i) => {
                        // 显示当前页附近的页码
                        let pageNum;
                        if (meta.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (meta.page <= 3) {
                          pageNum = i + 1;
                        } else if (meta.page >= meta.totalPages - 2) {
                          pageNum = meta.totalPages - 4 + i;
                        } else {
                          pageNum = meta.page - 2 + i;
                        }

                        return (
                          <a
                            key={pageNum}
                            href={buildPageUrl(pageNum)}
                            class={`join-item btn ${
                              pageNum === meta.page ? "btn-active" : ""
                            }`}
                          >
                            {pageNum}
                          </a>
                        );
                      },
                    )}

                    {/* 下一页 */}
                    {meta.page < meta.totalPages
                      ? (
                        <a
                          href={buildPageUrl(meta.page + 1)}
                          class="join-item btn"
                        >
                          »
                        </a>
                      )
                      : (
                        <button
                          type="button"
                          class="join-item btn btn-disabled"
                        >
                          »
                        </button>
                      )}
                  </div>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
});

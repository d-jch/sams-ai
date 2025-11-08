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

    const { id } = ctx.params;

    try {
      // 获取申请详情
      const response = await fetch(
        `${ctx.url.origin}/api/v1/requests/${id}`,
        {
          headers: {
            Cookie: ctx.req.headers.get("Cookie") || "",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { data: { error: "申请不存在" } };
        }
        throw new Error("获取申请详情失败");
      }

      const result = await response.json();
      return { data: { request: result.data } };
    } catch (error) {
      console.error("获取申请详情失败:", error);
      return { data: { error: "获取申请详情失败" } };
    }
  },
});

export default define.page<typeof handler>(function RequestDetailPage(props) {
  const user = props.state.user;
  const data = props.data as {
    request?: SequencingRequest;
    error?: string;
  };
  const request = data.request;
  const error = data.error;

  // 状态映射
  const statusMap: Record<RequestStatus, string> = {
    pending: "待处理",
    approved: "已批准",
    in_progress: "进行中",
    completed: "已完成",
    cancelled: "已取消",
  };

  const typeMap: Record<SequencingType, string> = {
    "WGS": "全基因组测序",
    "WES": "外显子测序",
    "RNA-seq": "RNA测序",
    "amplicon": "扩增子测序",
    "ChIP-seq": "ChIP测序",
  };

  const priorityMap: Record<PriorityLevel, string> = {
    low: "低",
    normal: "正常",
    high: "高",
    urgent: "紧急",
  };

  const statusColorMap: Record<RequestStatus, string> = {
    pending: "badge-warning",
    approved: "badge-info",
    in_progress: "badge-primary",
    completed: "badge-success",
    cancelled: "badge-neutral",
  };

  const priorityColorMap: Record<PriorityLevel, string> = {
    low: "badge-neutral",
    normal: "badge-info",
    high: "badge-warning",
    urgent: "badge-error",
  };

  // 可用的状态转换（根据当前状态）
  const getAvailableTransitions = (
    currentStatus: RequestStatus,
  ): RequestStatus[] => {
    const transitions: Record<RequestStatus, RequestStatus[]> = {
      pending: ["approved", "cancelled"],
      approved: ["in_progress", "cancelled"],
      in_progress: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };
    return transitions[currentStatus] || [];
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
          <h1 class="text-3xl font-bold">申请详情</h1>
        </div>

        {/* 错误提示 */}
        {error && (
          <div role="alert" class="alert alert-error">
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

        {/* 申请详情 */}
        {request && (
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：基本信息 */}
            <div class="lg:col-span-2 space-y-6">
              <div class="card bg-base-100 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">基本信息</h2>
                  <div class="overflow-x-auto">
                    <table class="table">
                      <tbody>
                        <tr>
                          <td class="font-semibold">申请 ID</td>
                          <td>
                            <span class="font-mono text-sm">{request.id}</span>
                          </td>
                        </tr>
                        <tr>
                          <td class="font-semibold">项目名称</td>
                          <td>{request.projectName}</td>
                        </tr>
                        <tr>
                          <td class="font-semibold">测序类型</td>
                          <td>{typeMap[request.sequencingType]}</td>
                        </tr>
                        <tr>
                          <td class="font-semibold">优先级</td>
                          <td>
                            <span
                              class={`badge ${
                                priorityColorMap[request.priority]
                              }`}
                            >
                              {priorityMap[request.priority]}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td class="font-semibold">状态</td>
                          <td>
                            <span
                              class={`badge ${statusColorMap[request.status]}`}
                            >
                              {statusMap[request.status]}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td class="font-semibold">预估成本</td>
                          <td>
                            {request.estimatedCost
                              ? `¥${request.estimatedCost.toFixed(2)}`
                              : "未设置"}
                          </td>
                        </tr>
                        <tr>
                          <td class="font-semibold">实际成本</td>
                          <td>
                            {request.actualCost
                              ? `¥${request.actualCost.toFixed(2)}`
                              : "未设置"}
                          </td>
                        </tr>
                        <tr>
                          <td class="font-semibold">创建时间</td>
                          <td>
                            {new Date(request.createdAt).toLocaleString(
                              "zh-CN",
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td class="font-semibold">更新时间</td>
                          <td>
                            {new Date(request.updatedAt).toLocaleString(
                              "zh-CN",
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 备注 */}
                  {request.notes && (
                    <div class="mt-4">
                      <h3 class="font-semibold mb-2">备注</h3>
                      <div class="p-4 bg-base-200 rounded-lg">
                        {request.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 样品列表（占位符） */}
              <div class="card bg-base-100 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">样品列表</h2>
                  <p class="text-gray-500">
                    样品管理功能即将上线...
                  </p>
                </div>
              </div>
            </div>

            {/* 右侧：操作面板 */}
            <div class="space-y-6">
              {/* 状态转换 */}
              {getAvailableTransitions(request.status).length > 0 && (
                <div class="card bg-base-100 shadow-xl">
                  <div class="card-body">
                    <h2 class="card-title">状态管理</h2>
                    <div class="space-y-2">
                      {getAvailableTransitions(request.status).map((
                        status,
                      ) => (
                        <form
                          method="POST"
                          action={`/api/v1/requests/${request.id}/status`}
                          key={status}
                        >
                          <input
                            type="hidden"
                            name="newStatus"
                            value={status}
                          />
                          <button
                            type="submit"
                            class={`btn btn-block ${
                              status === "cancelled"
                                ? "btn-error"
                                : "btn-primary"
                            }`}
                          >
                            转换为: {statusMap[status]}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 快捷操作 */}
              <div class="card bg-base-100 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">快捷操作</h2>
                  <div class="space-y-2">
                    <a
                      href={`/requests/${request.id}/edit`}
                      class="btn btn-block btn-outline"
                    >
                      编辑申请
                    </a>
                    <a
                      href={`/samples?requestId=${request.id}`}
                      class="btn btn-block btn-outline"
                    >
                      管理样品
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

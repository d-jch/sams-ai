import { define } from "../../utils.ts";
import type { QCStatus, Sample, SampleType } from "../../lib/types.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    const requestId = ctx.url.searchParams.get("requestId");

    try {
      // 获取样品列表（可选按申请ID筛选）
      const url = requestId
        ? `${ctx.url.origin}/api/v1/samples?requestId=${requestId}`
        : `${ctx.url.origin}/api/v1/samples`;

      const response = await fetch(url, {
        headers: {
          Cookie: ctx.req.headers.get("Cookie") || "",
        },
      });

      if (!response.ok) {
        throw new Error("获取样品列表失败");
      }

      const result = await response.json();
      return { data: { samples: result.data || [], requestId } };
    } catch (error) {
      console.error("获取样品列表失败:", error);
      return { data: { samples: [], requestId: null } };
    }
  },
});

export default define.page<typeof handler>(function SamplesPage(props) {
  const user = props.state.user;
  const { samples, requestId } = props.data as {
    samples: Sample[];
    requestId: string | null;
  };

  // 样品类型映射
  const typeMap: Record<SampleType, string> = {
    "DNA": "DNA",
    "RNA": "RNA",
    "Protein": "蛋白质",
    "Cell": "细胞",
  };

  // QC状态映射
  const qcStatusMap: Record<QCStatus, string> = {
    pending: "待检测",
    passed: "通过",
    failed: "失败",
    retest: "需重测",
  };

  // QC状态颜色
  const qcStatusColorMap: Record<QCStatus, string> = {
    pending: "badge-warning",
    passed: "badge-success",
    failed: "badge-error",
    retest: "badge-info",
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
          <div class="flex items-center gap-4">
            {requestId && (
              <a href="/requests" class="btn btn-ghost btn-sm">
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
                返回申请列表
              </a>
            )}
            <h1 class="text-3xl font-bold">
              {requestId ? `申请 ${requestId} 的样品` : "样品管理"}
            </h1>
          </div>
          {requestId && (
            <a
              href={`/samples/new?requestId=${requestId}`}
              class="btn btn-primary"
            >
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
              添加样品
            </a>
          )}
        </div>

        {/* 样品列表 */}
        {samples.length === 0
          ? (
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body text-center">
                <p class="text-gray-500">
                  {requestId ? "该申请暂无样品记录" : "暂无样品记录"}
                </p>
                {requestId && (
                  <div class="card-actions justify-center">
                    <a
                      href={`/samples/new?requestId=${requestId}`}
                      class="btn btn-primary"
                    >
                      添加第一个样品
                    </a>
                  </div>
                )}
              </div>
            </div>
          )
          : (
            <div class="overflow-x-auto">
              <table class="table table-zebra bg-base-100 shadow-xl">
                <thead>
                  <tr>
                    <th>样品名称</th>
                    <th>类型</th>
                    <th>条形码</th>
                    <th>浓度 (ng/µL)</th>
                    <th>体积 (µL)</th>
                    <th>QC状态</th>
                    <th>存储位置</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((sample: Sample) => (
                    <tr key={sample.id}>
                      <td>
                        <span class="font-semibold">{sample.name}</span>
                      </td>
                      <td>{typeMap[sample.type]}</td>
                      <td>
                        {sample.barcode
                          ? (
                            <span class="font-mono text-sm">
                              {sample.barcode}
                            </span>
                          )
                          : <span class="text-gray-400">-</span>}
                      </td>
                      <td>
                        {sample.concentration !== undefined
                          ? sample.concentration.toFixed(2)
                          : <span class="text-gray-400">-</span>}
                      </td>
                      <td>
                        {sample.volume !== undefined
                          ? sample.volume.toFixed(2)
                          : <span class="text-gray-400">-</span>}
                      </td>
                      <td>
                        <span
                          class={`badge ${qcStatusColorMap[sample.qcStatus]}`}
                        >
                          {qcStatusMap[sample.qcStatus]}
                        </span>
                      </td>
                      <td>
                        {sample.storageLocation || (
                          <span class="text-gray-400">-</span>
                        )}
                      </td>
                      <td>
                        <a
                          href={`/samples/${sample.id}`}
                          class="btn btn-sm btn-ghost"
                        >
                          编辑
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
});

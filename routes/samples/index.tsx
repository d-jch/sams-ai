import { define } from "../../utils.ts";
import type { QCStatus, Sample, SampleType } from "../../lib/types.ts";
import PageSizeSelector from "../../islands/PageSizeSelector.tsx";

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
    const page = ctx.url.searchParams.get("page") || "1";
    const limit = ctx.url.searchParams.get("limit") || "10";
    const sortBy = ctx.url.searchParams.get("sortBy") || "createdAt";
    const sortDir = ctx.url.searchParams.get("sortDir") || "DESC";

    try {
      // 构建 API 查询参数
      const apiParams = new URLSearchParams({ page, limit, sortBy, sortDir });
      if (requestId) apiParams.set("requestId", requestId);

      const url = `${ctx.url.origin}/api/v1/samples?${apiParams.toString()}`;

      const response = await fetch(url, {
        headers: {
          Cookie: ctx.req.headers.get("Cookie") || "",
        },
      });

      if (!response.ok) {
        throw new Error("获取样品列表失败");
      }

      const result = await response.json();
      return {
        data: {
          samples: result.data || [],
          meta: result.meta || { page: 1, limit: 10, total: 0, totalPages: 0 },
          requestId,
          sortBy,
          sortDir,
        },
      };
    } catch (error) {
      console.error("获取样品列表失败:", error);
      return {
        data: {
          samples: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
          requestId: null,
          sortBy: "createdAt",
          sortDir: "DESC",
        },
      };
    }
  },
});

export default define.page<typeof handler>(function SamplesPage(props) {
  const user = props.state.user;
  const { samples, meta, requestId, sortBy, sortDir } = props.data as {
    samples: Sample[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    requestId: string | null;
    sortBy: string;
    sortDir: string;
  };

  // 样品类型映射
  const typeMap: Record<SampleType, string> = {
    "DNA": "DNA",
    "RNA": "RNA",
    "Cell": "细胞",
    "PCR产物(已纯化)": "PCR产物(已纯化)",
    "PCR产物(未纯化)": "PCR产物(未纯化)",
    "菌株": "菌株",
    "质粒": "质粒",
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

  // 构建分页链接
  const buildPageUrl = (page: number, limit?: number) => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", (limit || meta.limit).toString());
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    if (requestId) params.set("requestId", requestId);
    return `/samples?${params.toString()}`;
  };

  // 构建排序链接
  const buildSortUrl = (column: string) => {
    const params = new URLSearchParams();
    params.set("page", "1"); // 排序时回到第一页
    params.set("limit", meta.limit.toString());
    params.set("sortBy", column);
    // 如果点击当前排序列，则切换方向
    params.set(
      "sortDir",
      sortBy === column && sortDir === "ASC" ? "DESC" : "ASC",
    );
    if (requestId) params.set("requestId", requestId);
    return `/samples?${params.toString()}`;
  };

  // 获取排序图标
  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 inline opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortDir === "ASC"
      ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 inline"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 15l7-7 7 7"
          />
        </svg>
      )
      : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 inline"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      );
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
          <div class="flex items-center gap-4">
            {/* 每页显示数量选择器 */}
            <PageSizeSelector
              currentLimit={meta.limit}
              requestId={requestId}
            />
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
                    <th>
                      <a
                        href={buildSortUrl("name")}
                        class="cursor-pointer hover:text-primary"
                      >
                        样品名称 {getSortIcon("name")}
                      </a>
                    </th>
                    <th>
                      <a
                        href={buildSortUrl("type")}
                        class="cursor-pointer hover:text-primary"
                      >
                        类型 {getSortIcon("type")}
                      </a>
                    </th>
                    <th>条形码</th>
                    <th>浓度 (ng/µL)</th>
                    <th>体积 (µL)</th>
                    <th>
                      <a
                        href={buildSortUrl("qcStatus")}
                        class="cursor-pointer hover:text-primary"
                      >
                        QC状态 {getSortIcon("qcStatus")}
                      </a>
                    </th>
                    <th>存储位置</th>
                    <th>
                      <a
                        href={buildSortUrl("userName")}
                        class="cursor-pointer hover:text-primary"
                      >
                        提交人 {getSortIcon("userName")}
                      </a>
                    </th>
                    <th>
                      <a
                        href={buildSortUrl("createdAt")}
                        class="cursor-pointer hover:text-primary"
                      >
                        提交时间 {getSortIcon("createdAt")}
                      </a>
                    </th>
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
                        {sample.concentration !== undefined &&
                            sample.concentration !== null
                          ? Number(sample.concentration).toFixed(2)
                          : <span class="text-gray-400">-</span>}
                      </td>
                      <td>
                        {sample.volume !== undefined && sample.volume !== null
                          ? Number(sample.volume).toFixed(2)
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
                        <span class="text-sm">
                          {sample.userName || (
                            <span class="text-gray-400">-</span>
                          )}
                        </span>
                      </td>
                      <td>
                        <span class="text-sm">
                          {new Date(sample.createdAt).toLocaleDateString(
                            "zh-CN",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            },
                          )}
                        </span>
                        <br />
                        <span class="text-xs text-gray-500">
                          {new Date(sample.createdAt).toLocaleTimeString(
                            "zh-CN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </td>
                      <td>
                        <a
                          href={`/samples/${sample.id}?returnTo=list`}
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
      </div>
    </div>
  );
});

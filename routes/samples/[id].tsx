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

    const { id } = ctx.params;

    try {
      // 获取样品详情
      const response = await fetch(
        `${ctx.url.origin}/api/v1/samples/${id}`,
        {
          headers: {
            Cookie: ctx.req.headers.get("Cookie") || "",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { data: { error: "样品不存在" } };
        }
        throw new Error("获取样品详情失败");
      }

      const result = await response.json();
      return { data: { sample: result.data } };
    } catch (error) {
      console.error("获取样品详情失败:", error);
      return { data: { error: "获取样品详情失败" } };
    }
  },

  async POST(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    const { id } = ctx.params;

    try {
      const formData = await ctx.req.formData();
      const name = formData.get("name") as string;
      const type = formData.get("type") as string;
      const barcode = formData.get("barcode") as string;
      const concentration = formData.get("concentration") as string;
      const volume = formData.get("volume") as string;
      const qcStatus = formData.get("qcStatus") as string;
      const storageLocation = formData.get("storageLocation") as string;
      const notes = formData.get("notes") as string;

      // 调用 API 更新样品
      const response = await fetch(
        `${ctx.url.origin}/api/v1/samples/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: ctx.req.headers.get("Cookie") || "",
          },
          body: JSON.stringify({
            name: name || undefined,
            type: type || undefined,
            barcode: barcode || undefined,
            concentration: concentration
              ? parseFloat(concentration)
              : undefined,
            volume: volume ? parseFloat(volume) : undefined,
            qcStatus: qcStatus || undefined,
            storageLocation: storageLocation || undefined,
            notes: notes || undefined,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        // 重新获取样品数据以显示表单
        const sampleResponse = await fetch(
          `${ctx.url.origin}/api/v1/samples/${id}`,
          {
            headers: {
              Cookie: ctx.req.headers.get("Cookie") || "",
            },
          },
        );
        const sampleResult = await sampleResponse.json();
        return {
          data: {
            sample: sampleResult.data,
            error: error.error || "更新样品失败",
          },
        };
      }

      const result = await response.json();
      // 更新成功，重定向回列表或保持在当前页
      return new Response(null, {
        status: 302,
        headers: { Location: `/samples?requestId=${result.data.requestId}` },
      });
    } catch (error) {
      console.error("更新样品失败:", error);
      // 重新获取样品数据
      const sampleResponse = await fetch(
        `${ctx.url.origin}/api/v1/samples/${id}`,
        {
          headers: {
            Cookie: ctx.req.headers.get("Cookie") || "",
          },
        },
      );
      const sampleResult = await sampleResponse.json();
      return {
        data: {
          sample: sampleResult.data,
          error: "更新样品失败，请稍后重试",
        },
      };
    }
  },
});

export default define.page<typeof handler>(function EditSamplePage(props) {
  const user = props.state.user;
  const data = props.data as { sample?: Sample; error?: string };
  const sample = data.sample;
  const error = data.error;

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

  // 检查是否可以修改QC状态（技术员、管理员）
  const canModifyQC = user?.role === "technician" ||
    user?.role === "lab_manager" || user?.role === "admin";

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
          <a
            href={sample
              ? `/samples?requestId=${sample.requestId}`
              : "/samples"}
            class="btn btn-ghost btn-sm mr-4"
          >
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
            返回样品列表
          </a>
          <h1 class="text-3xl font-bold">编辑样品</h1>
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

        {/* 编辑表单 */}
        {sample && (
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <form method="POST" class="space-y-4">
                {/* 样品名称 */}
                <label class="form-control">
                  <div class="label">
                    <span class="label-text font-semibold">
                      样品名称 <span class="text-error">*</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={sample.name}
                    placeholder="请输入样品名称"
                    class="input input-bordered"
                    required
                  />
                </label>

                {/* 样品类型 */}
                <label class="form-control">
                  <div class="label">
                    <span class="label-text font-semibold">
                      样品类型 <span class="text-error">*</span>
                    </span>
                  </div>
                  <select
                    name="type"
                    class="select select-bordered"
                    required
                  >
                    {(Object.keys(typeMap) as SampleType[]).map((type) => (
                      <option
                        key={type}
                        value={type}
                        selected={sample.type === type}
                      >
                        {typeMap[type]}
                      </option>
                    ))}
                  </select>
                </label>

                {/* 条形码 */}
                <label class="form-control">
                  <div class="label">
                    <span class="label-text font-semibold">条形码</span>
                  </div>
                  <input
                    type="text"
                    name="barcode"
                    value={sample.barcode || ""}
                    placeholder="请输入条形码"
                    class="input input-bordered"
                  />
                </label>

                {/* 浓度 */}
                <label class="form-control">
                  <div class="label">
                    <span class="label-text font-semibold">浓度 (ng/µL)</span>
                  </div>
                  <input
                    type="number"
                    name="concentration"
                    value={sample.concentration || ""}
                    placeholder="请输入浓度"
                    class="input input-bordered"
                    min="0"
                    step="0.01"
                  />
                </label>

                {/* 体积 */}
                <label class="form-control">
                  <div class="label">
                    <span class="label-text font-semibold">体积 (µL)</span>
                  </div>
                  <input
                    type="number"
                    name="volume"
                    value={sample.volume || ""}
                    placeholder="请输入体积"
                    class="input input-bordered"
                    min="0"
                    step="0.01"
                  />
                </label>

                {/* QC状态 */}
                <label class="form-control">
                  <div class="label">
                    <span class="label-text font-semibold">QC 状态</span>
                    {!canModifyQC && (
                      <span class="label-text-alt text-warning">
                        仅技术员和管理员可修改
                      </span>
                    )}
                  </div>
                  <select
                    name="qcStatus"
                    class="select select-bordered"
                    disabled={!canModifyQC}
                  >
                    {(Object.keys(qcStatusMap) as QCStatus[]).map((status) => (
                      <option
                        key={status}
                        value={status}
                        selected={sample.qcStatus === status}
                      >
                        {qcStatusMap[status]}
                      </option>
                    ))}
                  </select>
                </label>

                {/* 存储位置 */}
                <label class="form-control">
                  <div class="label">
                    <span class="label-text font-semibold">存储位置</span>
                  </div>
                  <input
                    type="text"
                    name="storageLocation"
                    value={sample.storageLocation || ""}
                    placeholder="例如：冰箱A-1-3"
                    class="input input-bordered"
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
                  >
                    {sample.notes || ""}
                  </textarea>
                </label>

                {/* 提交按钮 */}
                <div class="card-actions justify-end pt-4">
                  <a
                    href={`/samples?requestId=${sample.requestId}`}
                    class="btn btn-ghost"
                  >
                    取消
                  </a>
                  <button type="submit" class="btn btn-primary">
                    保存更改
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

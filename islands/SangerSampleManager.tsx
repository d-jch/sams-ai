import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface Sample {
  id: string;
  name: string;
  type: string;
  concentration?: number;
  volume?: number;
  qcStatus: string;
  notes?: string;
  primerIds?: string[];
  createdAt: string;
}

interface Primer {
  id: string;
  name: string;
  sequence: string;
  gcContent: number;
  tm: number;
  purpose?: string;
}

interface SangerSampleManagerProps {
  requestId: string;
  requestStatus: string;
  isOwner: boolean;
}

export default function SangerSampleManager(
  { requestId, requestStatus, isOwner }: SangerSampleManagerProps,
) {
  const samples = useSignal<Sample[]>([]);
  const primers = useSignal<Primer[]>([]);
  const loading = useSignal(true);
  const error = useSignal("");
  const showAddSample = useSignal(false);
  const selectedPrimers = useSignal<Record<string, string[]>>({});
  const currentSampleId = useSignal<string>(""); // 当前正在编辑引物的样品ID
  const searchQuery = useSignal<string>(""); // 引物搜索关键词

  // 判断是否可以添加/删除样品（只有待处理状态且是所有者可以操作）
  const canAddSamples = requestStatus === "pending" && isOwner;

  // 加载样品列表
  const loadSamples = async () => {
    try {
      const response = await fetch(`/api/v1/samples?requestId=${requestId}`);
      if (response.ok) {
        const result = await response.json();
        samples.value = result.data || [];

        // 从样品数据中设置已选择的引物
        const primerMap: Record<string, string[]> = {};
        (result.data || []).forEach((sample: Sample) => {
          if (sample.primerIds && sample.primerIds.length > 0) {
            primerMap[sample.id] = sample.primerIds;
          }
        });
        selectedPrimers.value = primerMap;
      } else {
        const errorData = await response.json().catch(() => ({
          error: "加载失败",
        }));
        error.value = errorData.error || "加载样品失败";
        console.error("加载样品失败:", response.status, errorData);
      }
    } catch (err) {
      error.value = "加载样品失败";
      console.error("加载样品异常:", err);
    }
  };

  // 加载引物库
  const loadPrimers = async () => {
    try {
      const response = await fetch("/api/v1/primers");
      if (response.ok) {
        const result = await response.json();
        primers.value = result.data || [];
      } else {
        console.error("加载引物失败:", response.status);
      }
    } catch (err) {
      console.error("加载引物异常:", err);
    }
  };

  // 初始化加载
  useEffect(() => {
    Promise.all([loadSamples(), loadPrimers()]).finally(() => {
      loading.value = false;
    });
  }, []);

  // 错误提示自动淡出
  useEffect(() => {
    if (error.value) {
      const timer = setTimeout(() => {
        error.value = "";
      }, 1000); // 1秒后自动清除

      return () => clearTimeout(timer);
    }
  }, [error.value]);

  // 添加样品
  const handleAddSample = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/v1/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          sampleName: formData.get("sampleName"),
          sampleType: formData.get("sampleType"),
          concentration: formData.get("concentration")
            ? parseFloat(formData.get("concentration") as string)
            : undefined,
          volume: formData.get("volume")
            ? parseFloat(formData.get("volume") as string)
            : undefined,
          notes: formData.get("notes") || undefined,
        }),
      });

      if (response.ok) {
        form.reset();
        showAddSample.value = false;
        await loadSamples();
      } else {
        const result = await response.json();
        error.value = result.error || "添加样品失败";
      }
    } catch (err) {
      error.value = "添加样品失败";
      console.error(err);
    }
  };

  // 分配/取消分配引物
  const handleTogglePrimer = async (sampleId: string, primerId: string) => {
    try {
      const currentPrimers = selectedPrimers.value[sampleId] || [];
      const isSelected = currentPrimers.includes(primerId);

      const response = await fetch(`/api/v1/samples/${sampleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primerIds: isSelected
            ? currentPrimers.filter((id) => id !== primerId) // 取消选择
            : [...currentPrimers, primerId], // 添加选择
        }),
      });

      if (response.ok) {
        await loadSamples();
      } else {
        const result = await response.json();
        error.value = result.error || "更新引物失败";
      }
    } catch (err) {
      error.value = "更新引物失败";
      console.error(err);
    }
  };

  // 打开引物选择对话框
  const openPrimerDialog = (sampleId: string) => {
    currentSampleId.value = sampleId;
    searchQuery.value = ""; // 重置搜索
    const dialog = document.getElementById(
      "primer-dialog",
    ) as HTMLDialogElement;
    dialog?.showModal();
  };

  // 关闭引物选择对话框
  const closePrimerDialog = () => {
    const dialog = document.getElementById(
      "primer-dialog",
    ) as HTMLDialogElement;
    dialog?.close();
    currentSampleId.value = "";
    searchQuery.value = "";
  };

  // 删除样品
  const handleDeleteSample = async (sampleId: string) => {
    try {
      const response = await fetch(`/api/v1/samples/${sampleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadSamples();
        error.value = ""; // 清除可能存在的错误
      } else {
        const result = await response.json();
        error.value = result.error || "删除样品失败";
      }
    } catch (err) {
      error.value = "删除样品失败";
      console.error(err);
    }
  };

  // 根据搜索关键词过滤引物
  const filteredPrimers = () => {
    const query = searchQuery.value.toLowerCase().trim();
    if (!query) return primers.value;

    return primers.value.filter((primer) =>
      primer.name.toLowerCase().includes(query) ||
      primer.sequence.toLowerCase().includes(query) ||
      (primer.purpose && primer.purpose.toLowerCase().includes(query))
    );
  };

  if (loading.value) {
    return (
      <div class="flex justify-center p-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div class="space-y-4">
      {/* 错误提示 - 自动淡出 */}
      {error.value && (
        <div
          role="alert"
          class="alert alert-error animate-fade-in"
          style="animation: fadeIn 0.3s ease-in, fadeOut 0.5s ease-out 2.5s forwards;"
        >
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
          <span>{error.value}</span>
        </div>
      )}

      {/* 添加样品按钮 */}
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold">
          样品列表 ({samples.value.length})
        </h3>
        {!showAddSample.value && canAddSamples && (
          <button
            type="button"
            class="btn btn-primary btn-sm"
            onClick={() => showAddSample.value = true}
          >
            + 添加样品
          </button>
        )}
      </div>

      {/* 添加样品表单 */}
      {showAddSample.value && (
        <div class="card bg-base-200">
          <div class="card-body">
            <h4 class="font-semibold mb-2">新增样品</h4>
            <form onSubmit={handleAddSample} class="space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label class="form-control">
                  <span class="label-text text-sm">
                    样品名称 <span class="text-error">*</span>
                  </span>
                  <input
                    type="text"
                    name="sampleName"
                    class="input input-sm input-bordered"
                    required
                    placeholder="如: Sample-001"
                  />
                </label>

                <label class="form-control">
                  <span class="label-text text-sm">
                    样品类型 <span class="text-error">*</span>
                  </span>
                  <select
                    name="sampleType"
                    class="select select-sm select-bordered"
                    required
                  >
                    <option value="">选择类型</option>
                    <option value="PCR产物(已纯化)">PCR产物(已纯化)</option>
                    <option value="PCR产物(未纯化)">PCR产物(未纯化)</option>
                    <option value="菌株">菌株</option>
                    <option value="质粒">质粒</option>
                  </select>
                </label>

                <label class="form-control">
                  <span class="label-text text-sm">浓度 (ng/μL)</span>
                  <input
                    type="number"
                    name="concentration"
                    class="input input-sm input-bordered"
                    min="0"
                    step="0.1"
                    placeholder="如: 50"
                  />
                </label>

                <label class="form-control">
                  <span class="label-text text-sm">体积 (μL)</span>
                  <input
                    type="number"
                    name="volume"
                    class="input input-sm input-bordered"
                    min="0"
                    step="0.1"
                    placeholder="如: 20"
                  />
                </label>
              </div>

              <label class="form-control">
                <span class="label-text text-sm">备注</span>
                <textarea
                  name="notes"
                  class="textarea textarea-sm textarea-bordered"
                  placeholder="可选：样品来源、处理方式等"
                />
              </label>

              <div class="flex justify-end gap-2">
                <button
                  type="button"
                  class="btn btn-sm btn-ghost"
                  onClick={() => showAddSample.value = false}
                >
                  取消
                </button>
                <button type="submit" class="btn btn-sm btn-primary">
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 样品列表 */}
      {samples.value.length === 0
        ? (
          <div class="text-center p-8 text-gray-500">
            暂无样品，请添加样品
          </div>
        )
        : (
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>样品名称</th>
                  <th>类型</th>
                  <th>浓度 (ng/μL)</th>
                  <th>体积 (μL)</th>
                  <th>QC状态</th>
                  <th>引物选择</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {samples.value.map((sample) => {
                  const samplePrimers = selectedPrimers.value[sample.id] || [];
                  return (
                    <tr key={sample.id}>
                      <td class="font-medium">{sample.name}</td>
                      <td>
                        <span class="badge badge-sm badge-outline">
                          {sample.type}
                        </span>
                      </td>
                      <td>
                        {sample.concentration
                          ? Number(sample.concentration).toFixed(1)
                          : "-"}
                      </td>
                      <td>
                        {sample.volume ? Number(sample.volume).toFixed(1) : "-"}
                      </td>
                      <td>
                        <span
                          class={`badge badge-sm ${
                            sample.qcStatus === "passed"
                              ? "badge-success"
                              : sample.qcStatus === "pending"
                              ? "badge-warning"
                              : "badge-error"
                          }`}
                        >
                          {sample.qcStatus === "passed"
                            ? "已通过"
                            : sample.qcStatus === "pending"
                            ? "待检测"
                            : "未通过"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline"
                          onClick={() => openPrimerDialog(sample.id)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          {samplePrimers.length > 0
                            ? `已选 ${samplePrimers.length} 个`
                            : "选择引物"}
                        </button>
                      </td>
                      <td>
                        <div class="flex gap-2">
                          <a
                            href={`/samples/${sample.id}`}
                            class="btn btn-xs btn-ghost"
                          >
                            详情
                          </a>
                          {canAddSamples && (
                            <button
                              type="button"
                              class="btn btn-xs btn-error btn-outline"
                              onClick={() => handleDeleteSample(sample.id)}
                              title="删除样品"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* 引物选择对话框 */}
      <dialog id="primer-dialog" class="modal">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg mb-4">选择引物（可多选）</h3>

          {/* 搜索框 */}
          <div class="form-control mb-4">
            <div class="input-group">
              <input
                type="text"
                placeholder="搜索引物名称或序列..."
                class="input input-bordered w-full"
                value={searchQuery.value}
                onInput={(e) =>
                  searchQuery.value = (e.target as HTMLInputElement).value}
              />
              {searchQuery.value && (
                <button
                  type="button"
                  class="btn btn-square"
                  onClick={() => searchQuery.value = ""}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* 引物列表 */}
          <div class="space-y-2 max-h-96 overflow-y-auto">
            {filteredPrimers().length === 0
              ? (
                <div class="text-center py-8 text-gray-500">
                  {searchQuery.value ? "未找到匹配的引物" : "暂无可用引物"}
                </div>
              )
              : (
                filteredPrimers().map((primer) => {
                  const samplePrimers = selectedPrimers.value[
                    currentSampleId.value
                  ] || [];
                  const isSelected = samplePrimers.includes(primer.id);

                  return (
                    <label
                      key={primer.id}
                      class={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-base-300 hover:bg-base-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        class="checkbox checkbox-primary mt-1"
                        checked={isSelected}
                        onChange={() =>
                          handleTogglePrimer(
                            currentSampleId.value,
                            primer.id,
                          )}
                      />
                      <div class="flex-1">
                        <div class="font-semibold text-base">
                          {primer.name}
                        </div>
                        <div class="text-sm text-gray-600 font-mono mt-1">
                          {primer.sequence}
                        </div>
                        <div class="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Tm: {Number(primer.tm).toFixed(1)}°C</span>
                          <span>
                            GC: {Number(primer.gcContent).toFixed(1)}%
                          </span>
                          {primer.purpose && (
                            <span>用途: {primer.purpose}</span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
          </div>

          {/* 对话框底部按钮 */}
          <div class="modal-action">
            <button
              type="button"
              class="btn btn-primary"
              onClick={closePrimerDialog}
            >
              完成
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" onClick={closePrimerDialog}>关闭</button>
        </form>
      </dialog>
    </div>
  );
}

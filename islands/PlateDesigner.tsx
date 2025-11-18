import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface Well {
  id?: string;
  position: string; // A01-H12
  sampleId?: string;
  sampleName?: string;
  status: "empty" | "pending" | "loaded" | "sequenced" | "failed";
}

interface PlateDesignerProps {
  requestId: string;
  plateId?: string;
}

export default function PlateDesigner(
  { requestId, plateId }: PlateDesignerProps,
) {
  const wells = useSignal<Record<string, Well>>({});
  const samples = useSignal<Array<{ id: string; sampleName: string }>>([]);
  const loading = useSignal(true);
  const selectedSample = useSignal("");
  const selectedWell = useSignal("");
  const autoAssignStrategy = useSignal<
    "row-first" | "column-first" | "skip-edges"
  >("row-first");
  const error = useSignal("");
  const success = useSignal("");

  // 生成所有96个孔位
  const generateAllWells = (): Record<string, Well> => {
    const allWells: Record<string, Well> = {};
    const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const cols = Array.from({ length: 12 }, (_, i) => i + 1);

    for (const row of rows) {
      for (const col of cols) {
        const position = `${row}${col.toString().padStart(2, "0")}`;
        allWells[position] = {
          position,
          status: "empty",
        };
      }
    }
    return allWells;
  };

  // 加载板图数据
  const loadPlate = async () => {
    if (!plateId) {
      wells.value = generateAllWells();
      loading.value = false;
      return;
    }

    try {
      const response = await fetch(`/api/v1/plates/${plateId}`);
      if (response.ok) {
        const result = await response.json();
        const allWells = generateAllWells();

        // 合并已分配的孔位
        if (result.data.wells) {
          result.data.wells.forEach((well: Well) => {
            allWells[well.position] = well;
          });
        }

        wells.value = allWells;
      }
    } catch (err) {
      error.value = "加载板图失败";
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  // 加载可用样品
  const loadSamples = async () => {
    try {
      const response = await fetch(`/api/v1/samples?requestId=${requestId}`);
      if (response.ok) {
        const result = await response.json();
        samples.value = result.data || [];
      }
    } catch (err) {
      console.error("加载样品失败:", err);
    }
  };

  useEffect(() => {
    Promise.all([loadPlate(), loadSamples()]);
  }, [plateId]);

  // 手动分配样品到孔位
  const assignSampleToWell = async () => {
    if (!selectedSample.value || !selectedWell.value) {
      error.value = "请选择样品和孔位";
      return;
    }

    if (!plateId) {
      error.value = "请先创建板图";
      return;
    }

    try {
      const response = await fetch(`/api/v1/plates/${plateId}/wells`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: selectedWell.value,
          sampleId: selectedSample.value,
        }),
      });

      if (response.ok) {
        success.value = "样品分配成功";
        selectedSample.value = "";
        selectedWell.value = "";
        await loadPlate();
      } else {
        const result = await response.json();
        error.value = result.error || "分配失败";
      }
    } catch (err) {
      error.value = "分配失败";
      console.error(err);
    }
  };

  // 自动分配所有样品
  const autoAssignSamples = async () => {
    if (!plateId) {
      // 先创建板图
      try {
        const createResponse = await fetch("/api/v1/plates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            plateName: `Plate-${new Date().toISOString().split("T")[0]}`,
            autoAssignSamples: true,
            assignmentStrategy: autoAssignStrategy.value,
          }),
        });

        if (createResponse.ok) {
          const result = await createResponse.json();
          success.value = "板图创建并自动分配成功！";
          // 重新加载页面以显示新板图
          globalThis.location.href =
            `/requests/${requestId}?plateId=${result.data.id}`;
        } else {
          const result = await createResponse.json();
          error.value = result.error || "创建板图失败";
        }
      } catch (err) {
        error.value = "创建板图失败";
        console.error(err);
      }
    }
  };

  // 获取孔位颜色
  const getWellColor = (well: Well): string => {
    if (selectedWell.value === well.position) return "bg-blue-500 text-white";
    if (well.status === "empty") return "bg-base-200 hover:bg-base-300";
    if (well.status === "pending") return "bg-warning/20 border-warning";
    if (well.status === "loaded") return "bg-info/20 border-info";
    if (well.status === "sequenced") return "bg-success/20 border-success";
    if (well.status === "failed") return "bg-error/20 border-error";
    return "bg-base-200";
  };

  if (loading.value) {
    return (
      <div class="flex justify-center p-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const wellsArray = Object.values(wells.value).sort((a, b) =>
    a.position.localeCompare(b.position)
  );
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const cols = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div class="space-y-6">
      {/* 消息提示 */}
      {error.value && (
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
          <span>{error.value}</span>
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            onClick={() => error.value = ""}
          >
            关闭
          </button>
        </div>
      )}

      {success.value && (
        <div role="alert" class="alert alert-success">
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{success.value}</span>
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            onClick={() => success.value = ""}
          >
            关闭
          </button>
        </div>
      )}

      {/* 操作面板 */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 手动分配 */}
        <div class="card bg-base-200">
          <div class="card-body">
            <h3 class="font-semibold mb-2">手动分配</h3>
            <div class="space-y-3">
              <label class="form-control">
                <span class="label-text text-sm">选择样品</span>
                <select
                  class="select select-sm select-bordered"
                  value={selectedSample.value}
                  onChange={(e) =>
                    selectedSample.value =
                      (e.target as HTMLSelectElement).value}
                >
                  <option value="">-- 选择样品 --</option>
                  {samples.value.map((sample) => (
                    <option key={sample.id} value={sample.id}>
                      {sample.sampleName}
                    </option>
                  ))}
                </select>
              </label>

              <label class="form-control">
                <span class="label-text text-sm">
                  选择孔位 (点击板图中的孔位)
                </span>
                <input
                  type="text"
                  class="input input-sm input-bordered"
                  value={selectedWell.value}
                  readOnly
                  placeholder="如: A01"
                />
              </label>

              <button
                type="button"
                class="btn btn-sm btn-primary w-full"
                onClick={assignSampleToWell}
                disabled={!selectedSample.value || !selectedWell.value}
              >
                分配到孔位
              </button>
            </div>
          </div>
        </div>

        {/* 自动分配 */}
        <div class="card bg-base-200">
          <div class="card-body">
            <h3 class="font-semibold mb-2">自动分配</h3>
            <div class="space-y-3">
              <label class="form-control">
                <span class="label-text text-sm">分配策略</span>
                <select
                  class="select select-sm select-bordered"
                  value={autoAssignStrategy.value}
                  onChange={(e) =>
                    autoAssignStrategy.value = (e.target as HTMLSelectElement)
                      .value as typeof autoAssignStrategy.value}
                >
                  <option value="row-first">按行优先 (A01→A02...)</option>
                  <option value="column-first">按列优先 (A01→B01...)</option>
                  <option value="skip-edges">跳过边缘孔</option>
                </select>
              </label>

              <div class="text-xs text-gray-600">
                {autoAssignStrategy.value === "row-first" &&
                  "样品从A01开始，按行依次分配"}
                {autoAssignStrategy.value === "column-first" &&
                  "样品从A01开始，按列依次分配"}
                {autoAssignStrategy.value === "skip-edges" &&
                  "跳过外围边缘孔，只使用内部60个孔 (B02-G11)"}
              </div>

              <button
                type="button"
                class="btn btn-sm btn-secondary w-full"
                onClick={autoAssignSamples}
                disabled={!samples.value.length}
              >
                自动分配所有样品
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 96孔板可视化 */}
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-semibold">96孔板布局</h3>
            <div class="flex gap-2 text-xs">
              <span class="flex items-center gap-1">
                <div class="w-4 h-4 bg-base-200 border"></div>
                空
              </span>
              <span class="flex items-center gap-1">
                <div class="w-4 h-4 bg-warning/20 border-warning border"></div>
                待处理
              </span>
              <span class="flex items-center gap-1">
                <div class="w-4 h-4 bg-info/20 border-info border"></div>
                已上样
              </span>
              <span class="flex items-center gap-1">
                <div class="w-4 h-4 bg-success/20 border-success border">
                </div>
                已测序
              </span>
            </div>
          </div>

          <div class="overflow-x-auto">
            <div class="inline-block min-w-full">
              {/* 列号 */}
              <div class="flex mb-1">
                <div class="w-8"></div>
                {cols.map((col) => (
                  <div
                    key={col}
                    class="w-12 text-center text-xs font-semibold"
                  >
                    {col}
                  </div>
                ))}
              </div>

              {/* 行 */}
              {rows.map((row) => (
                <div key={row} class="flex mb-1">
                  {/* 行号 */}
                  <div class="w-8 flex items-center justify-center text-xs font-semibold">
                    {row}
                  </div>

                  {/* 孔位 */}
                  {cols.map((col) => {
                    const position = `${row}${col.toString().padStart(2, "0")}`;
                    const well = wells.value[position];

                    return (
                      <button
                        type="button"
                        key={position}
                        class={`w-12 h-12 m-0.5 border rounded text-xs font-mono transition-colors ${
                          getWellColor(well)
                        }`}
                        onClick={() => {
                          if (well.status === "empty") {
                            selectedWell.value = position;
                          }
                        }}
                        title={well.sampleName || position}
                      >
                        {well.sampleName ? well.sampleName.substring(0, 6) : ""}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 统计 */}
          <div class="stats stats-horizontal shadow mt-4 w-full">
            <div class="stat">
              <div class="stat-title text-xs">总孔位</div>
              <div class="stat-value text-lg">96</div>
            </div>
            <div class="stat">
              <div class="stat-title text-xs">已分配</div>
              <div class="stat-value text-lg text-info">
                {wellsArray.filter((w) => w.status !== "empty").length}
              </div>
            </div>
            <div class="stat">
              <div class="stat-title text-xs">空孔位</div>
              <div class="stat-value text-lg">
                {wellsArray.filter((w) => w.status === "empty").length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

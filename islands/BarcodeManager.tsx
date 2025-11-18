import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface BarcodeKit {
  id: string;
  kitName: string;
  kitType: "single" | "dual";
  manufacturer: string;
  catalogNumber: string;
}

interface BarcodeSequence {
  id: string;
  barcodeName: string;
  index: "i7" | "i5";
  sequence: string;
  position: number;
}

interface Sample {
  id: string;
  sampleName: string;
  barcode?: string;
}

interface BarcodeManagerProps {
  requestId: string;
}

export default function BarcodeManager({ requestId }: BarcodeManagerProps) {
  const kits = useSignal<BarcodeKit[]>([]);
  const sequences = useSignal<BarcodeSequence[]>([]);
  const samples = useSignal<Sample[]>([]);
  const loading = useSignal(true);
  const selectedKit = useSignal("");
  const selectedSample = useSignal("");
  const selectedi7 = useSignal("");
  const selectedi5 = useSignal("");
  const error = useSignal("");
  const success = useSignal("");
  const showKitDetails = useSignal(false);

  // 加载试剂盒列表
  const loadKits = async () => {
    try {
      const response = await fetch("/api/v1/barcodes/kits");
      if (response.ok) {
        const result = await response.json();
        kits.value = result.data || [];
      }
    } catch (err) {
      console.error("加载试剂盒失败:", err);
    }
  };

  // 加载试剂盒序列
  const loadKitSequences = async (kitId: string) => {
    try {
      const response = await fetch(`/api/v1/barcodes/kits/${kitId}/sequences`);
      if (response.ok) {
        const result = await response.json();
        sequences.value = result.data.sequences || [];
      }
    } catch (err) {
      console.error("加载序列失败:", err);
    }
  };

  // 加载样品列表
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
    Promise.all([loadKits(), loadSamples()]).finally(() => {
      loading.value = false;
    });
  }, []);

  // 当选择试剂盒时加载序列
  useEffect(() => {
    if (selectedKit.value) {
      loadKitSequences(selectedKit.value);
      showKitDetails.value = true;
    } else {
      sequences.value = [];
      showKitDetails.value = false;
    }
  }, [selectedKit.value]);

  // 分配 Barcode
  const assignBarcode = async () => {
    if (!selectedSample.value) {
      error.value = "请选择样品";
      return;
    }

    const kit = kits.value.find((k) => k.id === selectedKit.value);
    if (!kit) {
      error.value = "请选择试剂盒";
      return;
    }

    // 验证索引选择
    if (!selectedi7.value) {
      error.value = "请选择 i7 索引";
      return;
    }

    if (kit.kitType === "dual" && !selectedi5.value) {
      error.value = "双索引试剂盒需要选择 i5 索引";
      return;
    }

    try {
      const response = await fetch("/api/v1/barcodes/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sampleId: selectedSample.value,
          barcodeKitId: selectedKit.value,
          i7Index: selectedi7.value,
          i5Index: kit.kitType === "dual" ? selectedi5.value : undefined,
        }),
      });

      if (response.ok) {
        success.value = "Barcode 分配成功";
        selectedSample.value = "";
        selectedi7.value = "";
        selectedi5.value = "";
        await loadSamples();
      } else {
        const result = await response.json();
        error.value = result.error || "分配失败";
      }
    } catch (err) {
      error.value = "分配失败";
      console.error(err);
    }
  };

  // 移除 Barcode
  const removeBarcode = async (sampleId: string) => {
    const sample = samples.value.find((s) => s.id === sampleId);
    if (!sample || !sample.barcode) return;

    if (!confirm(`确定要移除样品 "${sample.sampleName}" 的 Barcode 吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/samples/${sampleId}/barcode`, {
        method: "DELETE",
      });

      if (response.ok) {
        success.value = "Barcode 移除成功";
        await loadSamples();
      } else {
        const result = await response.json();
        error.value = result.error || "移除失败";
      }
    } catch (err) {
      error.value = "移除失败";
      console.error(err);
    }
  };

  if (loading.value) {
    return (
      <div class="flex justify-center p-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const selectedKitData = kits.value.find((k) => k.id === selectedKit.value);
  const i7Sequences = sequences.value.filter((s) => s.index === "i7");
  const i5Sequences = sequences.value.filter((s) => s.index === "i5");

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

      {/* Barcode 分配面板 */}
      <div class="card bg-base-200">
        <div class="card-body">
          <h3 class="font-semibold mb-4">分配 Barcode</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 选择试剂盒 */}
            <label class="form-control">
              <span class="label-text font-semibold">
                Barcode 试剂盒 <span class="text-error">*</span>
              </span>
              <select
                class="select select-bordered"
                value={selectedKit.value}
                onChange={(e) =>
                  selectedKit.value = (e.target as HTMLSelectElement).value}
              >
                <option value="">-- 选择试剂盒 --</option>
                {kits.value.map((kit) => (
                  <option key={kit.id} value={kit.id}>
                    {kit.kitName}{" "}
                    ({kit.kitType === "single" ? "单索引" : "双索引"})
                  </option>
                ))}
              </select>
            </label>

            {/* 选择样品 */}
            <label class="form-control">
              <span class="label-text font-semibold">
                样品 <span class="text-error">*</span>
              </span>
              <select
                class="select select-bordered"
                value={selectedSample.value}
                onChange={(e) =>
                  selectedSample.value = (e.target as HTMLSelectElement).value}
              >
                <option value="">-- 选择样品 --</option>
                {samples.value
                  .filter((s) => !s.barcode)
                  .map((sample) => (
                    <option key={sample.id} value={sample.id}>
                      {sample.sampleName}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {/* 索引选择（显示条件：选择了试剂盒） */}
          {showKitDetails.value && selectedKitData && (
            <div class="mt-4 p-4 bg-base-100 rounded-lg space-y-4">
              <div class="flex justify-between items-center">
                <h4 class="font-semibold">索引选择</h4>
                <span class="badge">
                  {selectedKitData.kitType === "single" ? "单索引" : "双索引"}
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* i7 索引 */}
                <label class="form-control">
                  <span class="label-text">
                    i7 索引 <span class="text-error">*</span>
                  </span>
                  <select
                    class="select select-sm select-bordered"
                    value={selectedi7.value}
                    onChange={(e) =>
                      selectedi7.value = (e.target as HTMLSelectElement).value}
                  >
                    <option value="">-- 选择 i7 --</option>
                    {i7Sequences.map((seq) => (
                      <option key={seq.id} value={seq.id}>
                        {seq.barcodeName} - {seq.sequence}
                      </option>
                    ))}
                  </select>
                </label>

                {/* i5 索引（仅双索引） */}
                {selectedKitData.kitType === "dual" && (
                  <label class="form-control">
                    <span class="label-text">
                      i5 索引 <span class="text-error">*</span>
                    </span>
                    <select
                      class="select select-sm select-bordered"
                      value={selectedi5.value}
                      onChange={(e) =>
                        selectedi5.value =
                          (e.target as HTMLSelectElement).value}
                    >
                      <option value="">-- 选择 i5 --</option>
                      {i5Sequences.map((seq) => (
                        <option key={seq.id} value={seq.id}>
                          {seq.barcodeName} - {seq.sequence}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <button
                type="button"
                class="btn btn-primary w-full"
                onClick={assignBarcode}
                disabled={!selectedSample.value || !selectedi7.value ||
                  (selectedKitData.kitType === "dual" && !selectedi5.value)}
              >
                分配 Barcode
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 样品 Barcode 列表 */}
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="font-semibold mb-4">样品 Barcode 列表</h3>

          {samples.value.length === 0
            ? (
              <p class="text-center text-gray-500 py-8">
                暂无样品
              </p>
            )
            : (
              <div class="overflow-x-auto">
                <table class="table table-zebra">
                  <thead>
                    <tr>
                      <th>样品名称</th>
                      <th>Barcode</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.value.map((sample) => (
                      <tr key={sample.id}>
                        <td class="font-medium">{sample.sampleName}</td>
                        <td>
                          {sample.barcode
                            ? (
                              <code class="bg-base-200 px-2 py-1 rounded text-xs">
                                {sample.barcode}
                              </code>
                            )
                            : <span class="text-gray-400">未分配</span>}
                        </td>
                        <td>
                          {sample.barcode
                            ? (
                              <span class="badge badge-success badge-sm">
                                已分配
                              </span>
                            )
                            : (
                              <span class="badge badge-warning badge-sm">
                                待分配
                              </span>
                            )}
                        </td>
                        <td>
                          {sample.barcode && (
                            <button
                              type="button"
                              class="btn btn-xs btn-error btn-outline"
                              onClick={() => removeBarcode(sample.id)}
                            >
                              移除
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          {/* 统计 */}
          <div class="stats stats-horizontal shadow mt-4">
            <div class="stat">
              <div class="stat-title text-xs">总样品</div>
              <div class="stat-value text-lg">{samples.value.length}</div>
            </div>
            <div class="stat">
              <div class="stat-title text-xs">已分配</div>
              <div class="stat-value text-lg text-success">
                {samples.value.filter((s) => s.barcode).length}
              </div>
            </div>
            <div class="stat">
              <div class="stat-title text-xs">待分配</div>
              <div class="stat-value text-lg text-warning">
                {samples.value.filter((s) => !s.barcode).length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

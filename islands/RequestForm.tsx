import { useSignal } from "@preact/signals";

interface RequestFormProps {
  error?: string;
}

export default function RequestForm({ error: _error }: RequestFormProps) {
  const sequencingType = useSignal("");
  const isSanger = useSignal(false);

  const handleTypeChange = (e: Event) => {
    const value = (e.target as HTMLSelectElement).value;
    sequencingType.value = value;
    isSanger.value = value === "sanger";
  };

  return (
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
              onChange={handleTypeChange}
            >
              <option value="">请选择测序类型</option>
              <optgroup label="NGS 高通量测序">
                <option value="WGS">全基因组测序 (WGS)</option>
                <option value="WES">外显子测序 (WES)</option>
                <option value="RNA-seq">RNA测序 (RNA-seq)</option>
                <option value="amplicon">扩增子测序</option>
                <option value="ChIP-seq">ChIP测序 (ChIP-seq)</option>
              </optgroup>
              <optgroup label="Sanger 测序">
                <option value="sanger">Sanger 测序</option>
              </optgroup>
            </select>
          </label>

          {/* Sanger 特有字段提示 */}
          {isSanger.value && (
            <div role="alert" class="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                class="h-6 w-6 shrink-0 stroke-current"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                Sanger 测序申请创建后，请在申请详情页添加样品并选择引物
              </span>
            </div>
          )}

          {/* NGS 特有字段：预估成本（Sanger 按样品数量计费，不需要预估） */}
          {!isSanger.value && sequencingType.value && (
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
          )}

          {/* 优先级 */}
          <label class="form-control">
            <div class="label">
              <span class="label-text font-semibold">优先级</span>
            </div>
            <select name="priority" class="select select-bordered">
              <option value="normal">正常</option>
              <option value="urgent">紧急</option>
            </select>
          </label>

          {/* 备注 */}
          <label class="form-control">
            <div class="label">
              <span class="label-text font-semibold">备注</span>
            </div>
            <textarea
              name="notes"
              placeholder={isSanger.value
                ? "如：目标基因、扩增片段大小等"
                : "请输入备注信息"}
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
  );
}

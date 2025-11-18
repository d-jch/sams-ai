interface PageSizeSelectorProps {
  currentLimit: number;
  requestId: string | null;
}

export default function PageSizeSelector(
  { currentLimit, requestId }: PageSizeSelectorProps,
) {
  const handleChange = (e: Event) => {
    const select = e.target as HTMLSelectElement;
    const newLimit = parseInt(select.value);

    // 构建 URL
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", newLimit.toString());
    if (requestId) params.set("requestId", requestId);

    globalThis.location.href = `/samples?${params.toString()}`;
  };

  return (
    <div class="form-control">
      <label class="label">
        <span class="label-text">每页显示</span>
      </label>
      <select
        class="select select-bordered"
        value={currentLimit}
        onChange={handleChange}
      >
        <option value="10">10 条</option>
        <option value="20">20 条</option>
        <option value="50">50 条</option>
        <option value="100">100 条</option>
      </select>
    </div>
  );
}

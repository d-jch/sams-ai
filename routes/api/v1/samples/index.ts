import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";

export const handler = define.handlers({
  // GET /api/v1/samples?request_id=xxx - 获取样品列表
  async GET(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const url = new URL(ctx.req.url);
    const requestId = url.searchParams.get("request_id");

    if (!requestId) {
      return Response.json(
        { error: "缺少 request_id 参数" },
        { status: 400 },
      );
    }

    const db = getDatabase();

    try {
      // 先检查申请是否存在及权限
      const request = await db.getRequestById(requestId);

      if (!request) {
        return Response.json({ error: "申请不存在" }, { status: 404 });
      }

      // 权限检查
      if (
        request.userId !== user.id &&
        user.role !== "admin" &&
        user.role !== "lab_manager" &&
        user.role !== "technician"
      ) {
        return Response.json({ error: "无权访问" }, { status: 403 });
      }

      const samples = await db.getSamplesByRequestId(requestId);

      return Response.json({
        success: true,
        data: samples,
      });
    } catch (error) {
      console.error("获取样品列表失败:", error);
      return Response.json(
        { error: "获取样品列表失败" },
        { status: 500 },
      );
    }
  },

  // POST /api/v1/samples - 创建新样品
  async POST(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    try {
      const body = await ctx.req.json();
      const db = getDatabase();

      // 验证必填字段
      if (!body.requestId || !body.name || !body.type) {
        return Response.json(
          { error: "申请ID、样品名称和类型为必填项" },
          { status: 400 },
        );
      }

      // 验证样品类型
      const validTypes = ["DNA", "RNA", "Protein", "Cell"];
      if (!validTypes.includes(body.type)) {
        return Response.json(
          { error: "无效的样品类型" },
          { status: 400 },
        );
      }

      // 检查申请是否存在及权限
      const request = await db.getRequestById(body.requestId);
      if (!request) {
        return Response.json({ error: "申请不存在" }, { status: 404 });
      }

      // 只有申请创建者可以添加样品
      if (request.userId !== user.id && user.role !== "admin") {
        return Response.json({ error: "无权添加样品" }, { status: 403 });
      }

      const sample = await db.createSample({
        requestId: body.requestId,
        name: body.name,
        type: body.type,
        barcode: body.barcode,
        concentration: body.concentration,
        volume: body.volume,
        storageLocation: body.storageLocation,
        notes: body.notes,
      });

      return Response.json({
        success: true,
        data: sample,
      }, { status: 201 });
    } catch (error) {
      console.error("创建样品失败:", error);
      return Response.json(
        { error: "创建样品失败" },
        { status: 500 },
      );
    }
  },
});

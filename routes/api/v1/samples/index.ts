import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";
import { canAccessRequest, requireAuth } from "../../../../lib/permissions.ts";
import type { User } from "../../../../lib/types.ts";

export const handler = define.handlers({
  // GET /api/v1/samples - 获取样品列表（支持分页和过滤）
  async GET(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const url = new URL(ctx.req.url);

    try {
      // 解析分页参数
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(url.searchParams.get("limit") || "10")),
      );

      // 解析过滤参数
      const filters: {
        type?: string;
        qcStatus?: string;
        requestId?: string;
      } = {};

      const requestId = url.searchParams.get("requestId");
      if (requestId) {
        // 检查申请访问权限
        const accessCheck = await canAccessRequest(user, requestId);
        if (accessCheck !== true) return accessCheck;

        filters.requestId = requestId;
      }

      const type = url.searchParams.get("type");
      if (type) filters.type = type;

      const qcStatus = url.searchParams.get("qcStatus");
      if (qcStatus) filters.qcStatus = qcStatus;

      const db = getDatabase();

      const { samples, total } = await db.getSamplesWithPagination(
        filters,
        { page, limit },
      );

      const totalPages = Math.ceil(total / limit);

      return Response.json({
        success: true,
        data: samples,
        meta: {
          page,
          limit,
          total,
          totalPages,
        },
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
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;

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

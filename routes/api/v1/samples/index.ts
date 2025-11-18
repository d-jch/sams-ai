import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";
import {
  canAccessRequest,
  canAssignBarcode,
  requireAuth,
} from "../../../../lib/permissions.ts";
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

      // 解析排序参数
      const sortColumn = url.searchParams.get("sortBy") || "createdAt";
      const sortDirection =
        url.searchParams.get("sortDir")?.toUpperCase() === "ASC"
          ? "ASC"
          : "DESC";
      const sort = {
        column: sortColumn,
        direction: sortDirection as "ASC" | "DESC",
      };

      const db = getDatabase();

      const { samples, total } = await db.getSamplesWithPagination(
        filters,
        { page, limit },
        sort,
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
      if (!body.requestId || !body.sampleName || !body.sampleType) {
        return Response.json(
          { error: "申请ID、样品名称和类型为必填项" },
          { status: 400 },
        );
      }

      // 验证样品类型（支持 NGS 和 Sanger 测序）
      const validTypes = [
        // NGS 样品类型
        "DNA",
        "RNA",
        "Cell",
        // Sanger 测序样品类型
        "PCR产物(已纯化)",
        "PCR产物(未纯化)",
        "菌株",
        "质粒",
      ];
      if (!validTypes.includes(body.sampleType)) {
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

      // 只有待处理状态的申请可以添加样品
      if (request.status !== "pending") {
        return Response.json(
          { error: "申请已提交，无法添加样品" },
          { status: 400 },
        );
      }

      // 只有申请创建者可以添加样品
      if (request.userId !== user.id && user.role !== "admin") {
        return Response.json({ error: "无权添加样品" }, { status: 403 });
      }

      // 检查样品名称是否在同一申请中重复
      const existingSamples = await db.getSamplesWithPagination(
        { requestId: body.requestId },
        { page: 1, limit: 1000 }, // 获取所有样品
      );
      const duplicateName = existingSamples.samples.some(
        (s) => s.name === body.sampleName,
      );
      if (duplicateName) {
        return Response.json(
          { error: "样品名称已存在，请使用不同的名称" },
          { status: 400 },
        );
      }

      // 只有技术员及以上可以设置 barcode
      if (body.barcode) {
        const barcodeCheck = canAssignBarcode(user);
        if (barcodeCheck !== true) {
          return Response.json(
            { error: "只有技术员及以上角色可以设置 Barcode" },
            { status: 403 },
          );
        }
      }

      const sample = await db.createSample({
        requestId: body.requestId,
        name: body.sampleName,
        type: body.sampleType,
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

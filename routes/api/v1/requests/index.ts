import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";
import { requireAuth } from "../../../../lib/permissions.ts";
import type { User } from "../../../../lib/types.ts";

export const handler = define.handlers({
  // GET /api/v1/requests - 获取申请列表（支持分页和过滤）
  async GET(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;

    try {
      const url = new URL(ctx.req.url);

      // 解析分页参数
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(url.searchParams.get("limit") || "10")),
      );

      // 解析过滤参数
      const filters: {
        status?: string;
        sequencingType?: string;
        priority?: string;
        dateFrom?: Date;
        dateTo?: Date;
      } = {};

      const status = url.searchParams.get("status");
      if (status) filters.status = status;

      const sequencingType = url.searchParams.get("sequencingType");
      if (sequencingType) filters.sequencingType = sequencingType;

      const priority = url.searchParams.get("priority");
      if (priority) filters.priority = priority;

      const dateFrom = url.searchParams.get("dateFrom");
      if (dateFrom) filters.dateFrom = new Date(dateFrom);

      const dateTo = url.searchParams.get("dateTo");
      if (dateTo) filters.dateTo = new Date(dateTo);

      const db = getDatabase();

      // 管理员、实验室主管和技术员可以看所有申请，研究员只能看自己的
      const userId = (user.role === "admin" || user.role === "lab_manager" ||
          user.role === "technician")
        ? null
        : user.id;

      const { requests, total } = await db.getRequestsWithPagination(
        userId,
        filters,
        { page, limit },
      );

      const totalPages = Math.ceil(total / limit);

      return Response.json({
        success: true,
        data: requests,
        meta: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("获取申请列表失败:", error);
      return Response.json(
        { error: "获取申请列表失败" },
        { status: 500 },
      );
    }
  },

  // POST /api/v1/requests - 创建新申请
  async POST(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;

    try {
      const body = await ctx.req.json();
      const db = getDatabase();

      // 验证必填字段
      if (!body.projectName || !body.sequencingType) {
        return Response.json(
          { error: "项目名称和测序类型为必填项" },
          { status: 400 },
        );
      }

      // 验证测序类型
      const validTypes = [
        "sanger",
        "WGS",
        "WES",
        "RNA-seq",
        "amplicon",
        "ChIP-seq",
      ];
      if (!validTypes.includes(body.sequencingType)) {
        return Response.json(
          { error: "无效的测序类型" },
          { status: 400 },
        );
      }

      // 创建申请
      const request = await db.createRequest({
        userId: user.id,
        projectName: body.projectName,
        sequencingType: body.sequencingType,
        priority: body.priority || "normal",
        estimatedCost: body.estimatedCost,
        notes: body.notes,
      });

      return Response.json({
        success: true,
        data: request,
      }, { status: 201 });
    } catch (error) {
      console.error("创建申请失败:", error);
      return Response.json(
        { error: "创建申请失败" },
        { status: 500 },
      );
    }
  },
});

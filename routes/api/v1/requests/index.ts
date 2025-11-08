import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";
import { requireAuth } from "../../../../lib/permissions.ts";
import type { User } from "../../../../lib/types.ts";

export const handler = define.handlers({
  // GET /api/v1/requests - 获取申请列表
  async GET(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;

    try {
      const db = getDatabase();

      // 管理员和实验室主管可以看所有申请，其他用户只能看自己的
      const requests = (user.role === "admin" || user.role === "lab_manager")
        ? await db.getAllRequests()
        : await db.getRequestsByUserId(user.id);

      return Response.json({
        success: true,
        data: requests,
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
      const validTypes = ["WGS", "WES", "RNA-seq", "amplicon", "ChIP-seq"];
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

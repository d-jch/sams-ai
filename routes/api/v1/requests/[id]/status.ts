import { define } from "../../../../../utils.ts";
import { getDatabase } from "../../../../../lib/db.ts";

export const handler = define.handlers({
  // PATCH /api/v1/requests/:id/status - 更新申请状态
  async PATCH(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = ctx.params;
    const db = getDatabase();

    try {
      const request = await db.getRequestById(id);

      if (!request) {
        return Response.json({ error: "申请不存在" }, { status: 404 });
      }

      // 权限检查：只有实验室主管和管理员可以修改状态
      if (user.role !== "admin" && user.role !== "lab_manager") {
        return Response.json({ error: "无权修改状态" }, { status: 403 });
      }

      const body = await ctx.req.json();

      // 验证状态
      const validStatuses = [
        "pending",
        "approved",
        "in_progress",
        "completed",
        "cancelled",
      ];
      if (!body.status || !validStatuses.includes(body.status)) {
        return Response.json(
          { error: "无效的状态值" },
          { status: 400 },
        );
      }

      const updated = await db.updateRequestStatus(
        id,
        body.status,
        user.id,
        body.comment,
      );

      return Response.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error("更新申请状态失败:", error);
      return Response.json(
        { error: "更新申请状态失败" },
        { status: 500 },
      );
    }
  },
});

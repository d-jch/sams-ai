import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";
import {
  canAccessRequest,
  canModifyRequest,
  requireAuth,
} from "../../../../lib/permissions.ts";
import type { User } from "../../../../lib/types.ts";

export const handler = define.handlers({
  // GET /api/v1/requests/:id - 获取申请详情
  async GET(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    try {
      const accessCheck = await canAccessRequest(user, id);
      if (accessCheck !== true) return accessCheck;

      const db = getDatabase();
      const request = await db.getRequestById(id);

      return Response.json({
        success: true,
        data: request,
      });
    } catch (error) {
      console.error("获取申请详情失败:", error);
      return Response.json(
        { error: "获取申请详情失败" },
        { status: 500 },
      );
    }
  },

  // PATCH /api/v1/requests/:id - 更新申请
  async PATCH(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    try {
      const modifyCheck = await canModifyRequest(user, id);
      if (modifyCheck !== true) return modifyCheck;

      const body = await ctx.req.json();
      const db = getDatabase();

      const updated = await db.updateRequest(id, {
        projectName: body.projectName,
        sequencingType: body.sequencingType,
        priority: body.priority,
        estimatedCost: body.estimatedCost,
        actualCost: body.actualCost,
        notes: body.notes,
      });

      return Response.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error("更新申请失败:", error);
      return Response.json(
        { error: "更新申请失败" },
        { status: 500 },
      );
    }
  },

  // DELETE /api/v1/requests/:id - 删除申请
  async DELETE(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;
    const db = getDatabase();

    try {
      // 只有管理员可以删除
      if (user.role !== "admin") {
        return Response.json({ error: "无权删除" }, { status: 403 });
      }

      const request = await db.getRequestById(id);
      if (!request) {
        return Response.json({ error: "申请不存在" }, { status: 404 });
      }

      await db.deleteRequest(id);

      return Response.json({
        success: true,
        message: "删除成功",
      });
    } catch (error) {
      console.error("删除申请失败:", error);
      return Response.json(
        { error: "删除申请失败" },
        { status: 500 },
      );
    }
  },
});

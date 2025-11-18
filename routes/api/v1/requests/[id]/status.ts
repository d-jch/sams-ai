import { define } from "../../../../../utils.ts";
import { getDatabase } from "../../../../../lib/db.ts";
import {
  canModifyRequestStatus,
  requireAuth,
} from "../../../../../lib/permissions.ts";
import type { User } from "../../../../../lib/types.ts";

export const handler = define.handlers({
  // PATCH /api/v1/requests/:id/status - 更新申请状态
  async PATCH(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    try {
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

      // 检查权限（传入目标状态）
      const statusCheck = await canModifyRequestStatus(user, id, body.status);
      if (statusCheck !== true) return statusCheck;

      const db = getDatabase();
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

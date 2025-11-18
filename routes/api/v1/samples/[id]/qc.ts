import { define } from "../../../../../utils.ts";
import { getDatabase } from "../../../../../lib/db.ts";
import {
  canModifyQCStatus,
  requireAuth,
} from "../../../../../lib/permissions.ts";
import type { User } from "../../../../../lib/types.ts";

export const handler = define.handlers({
  // PATCH /api/v1/samples/:id/qc - 更新样品质检状态（技术员专属）
  async PATCH(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    try {
      // 只有技术员及以上可以修改 QC 状态
      const qcCheck = canModifyQCStatus(user);
      if (qcCheck !== true) return qcCheck;

      const body = await ctx.req.json();

      // 验证 qcStatus 字段
      if (!body.qcStatus) {
        return Response.json(
          { error: "qcStatus 字段为必填项" },
          { status: 400 },
        );
      }

      const validStatuses = ["pending", "passed", "failed", "retest"];
      if (!validStatuses.includes(body.qcStatus)) {
        return Response.json(
          { error: "无效的质检状态" },
          { status: 400 },
        );
      }

      const db = getDatabase();
      const sample = await db.getSampleById(id);

      if (!sample) {
        return Response.json({ error: "样品不存在" }, { status: 404 });
      }

      // 更新质检状态和相关数据
      const updated = await db.updateSample(id, {
        qcStatus: body.qcStatus,
        concentration: body.concentration,
        volume: body.volume,
        notes: body.notes,
      });

      return Response.json({
        success: true,
        data: updated,
        message: `质检状态已更新为: ${body.qcStatus}`,
      });
    } catch (error) {
      console.error("更新质检状态失败:", error);
      return Response.json(
        { error: "更新质检状态失败" },
        { status: 500 },
      );
    }
  },
});

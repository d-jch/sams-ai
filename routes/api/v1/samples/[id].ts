import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";
import {
  canAccessSample,
  canModifyQCStatus,
  canModifySample,
  requireAuth,
} from "../../../../lib/permissions.ts";
import type { User } from "../../../../lib/types.ts";

export const handler = define.handlers({
  // GET /api/v1/samples/:id - 获取样品详情
  async GET(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    try {
      const accessCheck = await canAccessSample(user, id);
      if (accessCheck !== true) return accessCheck;

      const db = getDatabase();
      const sample = await db.getSampleById(id);

      return Response.json({
        success: true,
        data: sample,
      });
    } catch (error) {
      console.error("获取样品详情失败:", error);
      return Response.json(
        { error: "获取样品详情失败" },
        { status: 500 },
      );
    }
  },

  // PATCH /api/v1/samples/:id - 更新样品
  async PATCH(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    try {
      const modifyCheck = await canModifySample(user, id);
      if (modifyCheck !== true) return modifyCheck;

      const body = await ctx.req.json();

      // 只有技术员和管理员可以修改 QC 状态
      if (body.qcStatus) {
        const qcCheck = canModifyQCStatus(user);
        if (qcCheck !== true) return qcCheck;
      }

      const db = getDatabase();
      const updated = await db.updateSample(id, {
        name: body.name,
        type: body.type,
        barcode: body.barcode,
        concentration: body.concentration,
        volume: body.volume,
        qcStatus: body.qcStatus,
        storageLocation: body.storageLocation,
        notes: body.notes,
      });

      return Response.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error("更新样品失败:", error);
      return Response.json(
        { error: "更新样品失败" },
        { status: 500 },
      );
    }
  },

  // DELETE /api/v1/samples/:id - 删除样品
  async DELETE(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;
    const db = getDatabase();

    try {
      // 只有管理员可以删除样品
      if (user.role !== "admin") {
        return Response.json({ error: "无权删除" }, { status: 403 });
      }

      const sample = await db.getSampleById(id);
      if (!sample) {
        return Response.json({ error: "样品不存在" }, { status: 404 });
      }

      await db.deleteSample(id);

      return Response.json({
        success: true,
        message: "删除成功",
      });
    } catch (error) {
      console.error("删除样品失败:", error);
      return Response.json(
        { error: "删除样品失败" },
        { status: 500 },
      );
    }
  },
});

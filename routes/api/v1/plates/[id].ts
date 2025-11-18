import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";
import { requireAuth } from "../../../../lib/permissions.ts";
import type { User } from "../../../../lib/types.ts";

export const handler = define.handlers({
  // GET /api/v1/plates/:id - 获取板布局详情（包含孔位分配）
  async GET(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const { id } = ctx.params;

    try {
      const db = getDatabase();
      const plate = await db.getPlateLayoutById(id);

      if (!plate) {
        return Response.json({ error: "板布局不存在" }, { status: 404 });
      }

      // 获取孔位分配
      const wellAssignments = await db.getWellAssignmentsByPlateId(id);

      // 获取样品详情
      const samplesMap = new Map();
      for (const well of wellAssignments) {
        if (!samplesMap.has(well.sampleId)) {
          const sample = await db.getSampleById(well.sampleId);
          if (sample) samplesMap.set(well.sampleId, sample);
        }
      }

      // 组合数据
      const wellsWithSamples = wellAssignments.map((well) => ({
        ...well,
        sample: samplesMap.get(well.sampleId),
      }));

      return Response.json({
        success: true,
        data: {
          plate,
          wells: wellsWithSamples,
        },
      });
    } catch (error) {
      console.error("获取板布局详情失败:", error);
      return Response.json(
        { error: "获取板布局详情失败" },
        { status: 500 },
      );
    }
  },

  // DELETE /api/v1/plates/:id - 删除板布局
  async DELETE(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    // 只有技术员及以上可以删除板布局
    if (!["technician", "lab_manager", "admin"].includes(user.role)) {
      return Response.json(
        { error: "只有技术员及以上角色可以删除板布局" },
        { status: 403 },
      );
    }

    try {
      const db = getDatabase();

      const plate = await db.getPlateLayoutById(id);
      if (!plate) {
        return Response.json({ error: "板布局不存在" }, { status: 404 });
      }

      // 删除板布局（会级联删除孔位分配）
      await db.deletePlateLayout(id);

      return Response.json({
        success: true,
        message: "板布局已删除",
      });
    } catch (error) {
      console.error("删除板布局失败:", error);
      return Response.json(
        { error: "删除板布局失败" },
        { status: 500 },
      );
    }
  },
});

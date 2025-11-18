import { define } from "../../../../../utils.ts";
import { getDatabase } from "../../../../../lib/db.ts";
import { requireAuth } from "../../../../../lib/permissions.ts";
import type { User } from "../../../../../lib/types.ts";

export const handler = define.handlers({
  // POST /api/v1/plates/:id/wells - 添加孔位分配
  async POST(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    // 只有技术员及以上可以分配孔位
    if (!["technician", "lab_manager", "admin"].includes(user.role)) {
      return Response.json(
        { error: "只有技术员及以上角色可以分配孔位" },
        { status: 403 },
      );
    }

    try {
      const body = await ctx.req.json();

      // 验证必填字段
      if (!body.sampleId || !body.wellPosition) {
        return Response.json(
          { error: "sampleId 和 wellPosition 为必填项" },
          { status: 400 },
        );
      }

      // 验证孔位格式（A01-H12）
      if (!/^[A-H](0[1-9]|1[0-2])$/.test(body.wellPosition)) {
        return Response.json(
          { error: "孔位格式无效，应为 A01-H12" },
          { status: 400 },
        );
      }

      const db = getDatabase();

      // 验证板布局是否存在
      const plate = await db.getPlateLayoutById(id);
      if (!plate) {
        return Response.json({ error: "板布局不存在" }, { status: 404 });
      }

      // 验证样品是否存在
      const sample = await db.getSampleById(body.sampleId);
      if (!sample) {
        return Response.json({ error: "样品不存在" }, { status: 404 });
      }

      // 创建孔位分配
      const wellAssignment = await db.createWellAssignment({
        plateLayoutId: id,
        sampleId: body.sampleId,
        wellPosition: body.wellPosition,
      });

      return Response.json({
        success: true,
        data: wellAssignment,
      }, { status: 201 });
    } catch (error) {
      console.error("添加孔位分配失败:", error);

      // 检查唯一性约束冲突
      const err = error as { code?: string; message?: string };
      if (err.code === "23505") {
        if (err.message?.includes("unique_plate_well")) {
          return Response.json(
            { error: "该孔位已被占用" },
            { status: 409 },
          );
        }
        if (err.message?.includes("unique_plate_sample")) {
          return Response.json(
            { error: "该样品已在此板中分配" },
            { status: 409 },
          );
        }
      }

      return Response.json(
        { error: "添加孔位分配失败" },
        { status: 500 },
      );
    }
  },

  // PATCH /api/v1/plates/:id/wells/:wellId - 更新孔位状态
  async PATCH(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { wellId } = ctx.params;

    // 只有技术员及以上可以更新孔位状态
    if (!["technician", "lab_manager", "admin"].includes(user.role)) {
      return Response.json(
        { error: "只有技术员及以上角色可以更新孔位状态" },
        { status: 403 },
      );
    }

    try {
      const body = await ctx.req.json();

      // 验证状态值
      const validStatuses = ["pending", "loaded", "sequenced", "failed"];
      if (!body.status || !validStatuses.includes(body.status)) {
        return Response.json(
          { error: "无效的孔位状态" },
          { status: 400 },
        );
      }

      const db = getDatabase();
      const updated = await db.updateWellAssignmentStatus(
        wellId,
        body.status,
      );

      return Response.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error("更新孔位状态失败:", error);
      return Response.json(
        { error: "更新孔位状态失败" },
        { status: 500 },
      );
    }
  },

  // DELETE /api/v1/plates/:id/wells/:wellId - 删除孔位分配
  async DELETE(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { wellId } = ctx.params;

    // 只有技术员及以上可以删除孔位分配
    if (!["technician", "lab_manager", "admin"].includes(user.role)) {
      return Response.json(
        { error: "只有技术员及以上角色可以删除孔位分配" },
        { status: 403 },
      );
    }

    try {
      const db = getDatabase();
      await db.deleteWellAssignment(wellId);

      return Response.json({
        success: true,
        message: "孔位分配已删除",
      });
    } catch (error) {
      console.error("删除孔位分配失败:", error);
      return Response.json(
        { error: "删除孔位分配失败" },
        { status: 500 },
      );
    }
  },
});

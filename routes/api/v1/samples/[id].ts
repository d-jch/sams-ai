import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";

export const handler = define.handlers({
  // GET /api/v1/samples/:id - 获取样品详情
  async GET(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = ctx.params;
    const db = getDatabase();

    try {
      const sample = await db.getSampleById(id);

      if (!sample) {
        return Response.json({ error: "样品不存在" }, { status: 404 });
      }

      // 检查关联申请的权限
      const request = await db.getRequestById(sample.requestId);
      if (!request) {
        return Response.json({ error: "关联申请不存在" }, { status: 404 });
      }

      if (
        request.userId !== user.id &&
        user.role !== "admin" &&
        user.role !== "lab_manager" &&
        user.role !== "technician"
      ) {
        return Response.json({ error: "无权访问" }, { status: 403 });
      }

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
    const user = ctx.state.user;
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = ctx.params;
    const db = getDatabase();

    try {
      const sample = await db.getSampleById(id);

      if (!sample) {
        return Response.json({ error: "样品不存在" }, { status: 404 });
      }

      // 检查关联申请的权限
      const request = await db.getRequestById(sample.requestId);
      if (!request) {
        return Response.json({ error: "关联申请不存在" }, { status: 404 });
      }

      // 技术员、管理员和实验室主管可以更新样品信息（特别是QC状态）
      // 申请创建者可以更新基本信息
      const canUpdate = request.userId === user.id ||
        user.role === "admin" ||
        user.role === "lab_manager" ||
        user.role === "technician";

      if (!canUpdate) {
        return Response.json({ error: "无权修改" }, { status: 403 });
      }

      const body = await ctx.req.json();

      // 只有技术员和管理员可以修改 QC 状态
      if (
        body.qcStatus &&
        user.role !== "admin" &&
        user.role !== "lab_manager" &&
        user.role !== "technician"
      ) {
        return Response.json(
          { error: "无权修改 QC 状态" },
          { status: 403 },
        );
      }

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
    const user = ctx.state.user;
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = ctx.params;
    const db = getDatabase();

    try {
      const sample = await db.getSampleById(id);

      if (!sample) {
        return Response.json({ error: "样品不存在" }, { status: 404 });
      }

      // 只有管理员可以删除样品
      if (user.role !== "admin") {
        return Response.json({ error: "无权删除" }, { status: 403 });
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

import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";

export const handler = define.handlers({
  // GET /api/v1/requests/:id - 获取申请详情
  async GET(ctx) {
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

      // 权限检查：只有创建者、管理员或实验室主管可以查看
      if (
        request.userId !== user.id &&
        user.role !== "admin" &&
        user.role !== "lab_manager"
      ) {
        return Response.json({ error: "无权访问" }, { status: 403 });
      }

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

      // 权限检查：只有创建者可以更新（pending 状态时），或管理员
      if (
        request.userId !== user.id &&
        user.role !== "admin" &&
        user.role !== "lab_manager"
      ) {
        return Response.json({ error: "无权修改" }, { status: 403 });
      }

      // 如果不是 pending 状态，普通用户不能修改
      if (
        request.status !== "pending" &&
        user.role !== "admin" &&
        user.role !== "lab_manager"
      ) {
        return Response.json(
          { error: "申请已审核，无法修改" },
          { status: 403 },
        );
      }

      const body = await ctx.req.json();

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

      // 权限检查：只有管理员可以删除
      if (user.role !== "admin") {
        return Response.json({ error: "无权删除" }, { status: 403 });
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

import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";
import {
  canAccessSample,
  canAssignBarcode,
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

      // 只有技术员及以上可以修改 barcode
      if (body.barcode !== undefined) {
        const barcodeCheck = canAssignBarcode(user);
        if (barcodeCheck !== true) {
          return Response.json(
            { error: "只有技术员及以上角色可以设置 Barcode" },
            { status: 403 },
          );
        }
      }

      const db = getDatabase();

      // 如果提供了 primerIds 数组，批量更新引物关联
      if (body.primerIds !== undefined && Array.isArray(body.primerIds)) {
        // 先清除所有现有引物关联
        await db.clearSamplePrimers(id);

        // 如果有新的引物，批量添加
        if (body.primerIds.length > 0) {
          for (const primerId of body.primerIds) {
            await db.assignPrimerToSample(id, primerId);
          }
        }
      } else if (body.primerId !== undefined) {
        // 向后兼容：单个 primerId（已弃用，使用 primerIds）
        if (body.primerId === "") {
          // 空字符串表示移除引物关联
          await db.clearSamplePrimers(id);
        } else {
          await db.assignPrimerToSample(id, body.primerId);
        }
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
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;
    const db = getDatabase();

    try {
      const sample = await db.getSampleById(id);
      if (!sample) {
        return Response.json({ error: "样品不存在" }, { status: 404 });
      }

      // 获取样品所属的申请
      const request = await db.getRequestById(sample.requestId);
      if (!request) {
        return Response.json({ error: "申请不存在" }, { status: 404 });
      }

      // 权限检查：管理员可以删除任何样品，申请人只能删除自己待处理申请中的样品
      const isAdmin = user.role === "admin";
      const isOwner = request.userId === user.id;
      const isPending = request.status === "pending";

      if (!isAdmin && (!isOwner || !isPending)) {
        if (!isOwner) {
          return Response.json({ error: "无权删除" }, { status: 403 });
        }
        if (!isPending) {
          return Response.json(
            { error: "申请已提交，无法删除样品" },
            { status: 400 },
          );
        }
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

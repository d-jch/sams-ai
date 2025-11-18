import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";
import { canAssignBarcode, requireAuth } from "../../../../lib/permissions.ts";
import type { User } from "../../../../lib/types.ts";

export const handler = define.handlers({
  // POST /api/v1/barcodes/assign - 为样品分配Barcode
  async POST(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;

    // 只有技术员及以上可以分配Barcode
    const barcodeCheck = canAssignBarcode(user);
    if (barcodeCheck !== true) return barcodeCheck;

    try {
      const body = await ctx.req.json();

      // 验证必填字段
      if (!body.sampleId || !body.kitId) {
        return Response.json(
          { error: "sampleId 和 kitId 为必填项" },
          { status: 400 },
        );
      }

      const db = getDatabase();

      // 验证样品是否存在
      const sample = await db.getSampleById(body.sampleId);
      if (!sample) {
        return Response.json({ error: "样品不存在" }, { status: 404 });
      }

      // 验证试剂盒是否存在
      const kit = await db.getBarcodeKitById(body.kitId);
      if (!kit) {
        return Response.json({ error: "试剂盒不存在" }, { status: 404 });
      }

      // 检查样品是否已分配Barcode
      const existing = await db.getBarcodeAssignmentBySampleId(body.sampleId);
      if (existing) {
        return Response.json(
          { error: "该样品已分配Barcode" },
          { status: 409 },
        );
      }

      // 验证索引类型
      if (kit.indexType === "single" && !body.i7IndexId) {
        return Response.json(
          { error: "单索引试剂盒需要提供 i7IndexId" },
          { status: 400 },
        );
      }

      if (kit.indexType === "dual" && (!body.i7IndexId || !body.i5IndexId)) {
        return Response.json(
          { error: "双索引试剂盒需要同时提供 i7IndexId 和 i5IndexId" },
          { status: 400 },
        );
      }

      // 创建Barcode分配
      const assignment = await db.createBarcodeAssignment({
        sampleId: body.sampleId,
        kitId: body.kitId,
        i7IndexId: body.i7IndexId,
        i5IndexId: body.i5IndexId,
        assignedBy: user.id,
      });

      return Response.json({
        success: true,
        data: assignment,
      }, { status: 201 });
    } catch (error) {
      console.error("分配Barcode失败:", error);
      return Response.json(
        { error: "分配Barcode失败" },
        { status: 500 },
      );
    }
  },

  // DELETE /api/v1/barcodes/assign/:assignmentId - 移除Barcode分配
  async DELETE(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { assignmentId } = ctx.params;

    // 只有技术员及以上可以移除Barcode
    const barcodeCheck = canAssignBarcode(user);
    if (barcodeCheck !== true) return barcodeCheck;

    try {
      const db = getDatabase();
      await db.deleteBarcodeAssignment(assignmentId);

      return Response.json({
        success: true,
        message: "Barcode分配已移除",
      });
    } catch (error) {
      console.error("移除Barcode分配失败:", error);
      return Response.json(
        { error: "移除Barcode分配失败" },
        { status: 500 },
      );
    }
  },
});

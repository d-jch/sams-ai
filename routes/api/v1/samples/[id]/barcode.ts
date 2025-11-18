import { define } from "../../../../../utils.ts";
import { getDatabase } from "../../../../../lib/db.ts";
import {
  canAssignBarcode,
  requireAuth,
} from "../../../../../lib/permissions.ts";
import type { User } from "../../../../../lib/types.ts";

export const handler = define.handlers({
  // PATCH /api/v1/samples/:id/barcode - 分配 Barcode（技术员专属）
  async PATCH(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    try {
      // 只有技术员及以上可以分配 Barcode
      const barcodeCheck = canAssignBarcode(user);
      if (barcodeCheck !== true) return barcodeCheck;

      const body = await ctx.req.json();

      // 验证 barcode 字段
      if (!body.barcode) {
        return Response.json(
          { error: "barcode 字段为必填项" },
          { status: 400 },
        );
      }

      const db = getDatabase();
      const sample = await db.getSampleById(id);

      if (!sample) {
        return Response.json({ error: "样品不存在" }, { status: 404 });
      }

      // 检查 barcode 是否已被使用
      const existingSample = await db.getSampleByBarcode(body.barcode);
      if (existingSample && existingSample.id !== id) {
        return Response.json(
          { error: "该 Barcode 已被其他样品使用" },
          { status: 409 },
        );
      }

      // 更新 barcode
      const updated = await db.updateSample(id, {
        barcode: body.barcode,
      });

      return Response.json({
        success: true,
        data: updated,
        message: `Barcode 已设置为: ${body.barcode}`,
      });
    } catch (error) {
      console.error("分配 Barcode 失败:", error);
      return Response.json(
        { error: "分配 Barcode 失败" },
        { status: 500 },
      );
    }
  },

  // DELETE /api/v1/samples/:id/barcode - 移除 Barcode（技术员专属）
  async DELETE(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    try {
      // 只有技术员及以上可以移除 Barcode
      const barcodeCheck = canAssignBarcode(user);
      if (barcodeCheck !== true) return barcodeCheck;

      const db = getDatabase();
      const sample = await db.getSampleById(id);

      if (!sample) {
        return Response.json({ error: "样品不存在" }, { status: 404 });
      }

      // 清除 barcode
      const updated = await db.updateSample(id, {
        barcode: undefined,
      });

      return Response.json({
        success: true,
        data: updated,
        message: "Barcode 已移除",
      });
    } catch (error) {
      console.error("移除 Barcode 失败:", error);
      return Response.json(
        { error: "移除 Barcode 失败" },
        { status: 500 },
      );
    }
  },
});

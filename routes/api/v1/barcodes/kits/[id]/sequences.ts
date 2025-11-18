import { define } from "../../../../../../utils.ts";
import { getDatabase } from "../../../../../../lib/db.ts";
import { requireAuth } from "../../../../../../lib/permissions.ts";

export const handler = define.handlers({
  // GET /api/v1/barcodes/kits/:id/sequences - 获取试剂盒的Barcode序列
  async GET(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const { id } = ctx.params;

    try {
      const db = getDatabase();

      const kit = await db.getBarcodeKitById(id);
      if (!kit) {
        return Response.json({ error: "试剂盒不存在" }, { status: 404 });
      }

      const sequences = await db.getBarcodeSequencesByKitId(id);

      return Response.json({
        success: true,
        data: {
          kit,
          sequences,
        },
      });
    } catch (error) {
      console.error("获取Barcode序列失败:", error);
      return Response.json(
        { error: "获取Barcode序列失败" },
        { status: 500 },
      );
    }
  },
});

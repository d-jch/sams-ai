import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";
import { requireAuth } from "../../../../lib/permissions.ts";

export const handler = define.handlers({
  // GET /api/v1/barcodes/kits - 获取Barcode试剂盒列表
  async GET(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    try {
      const db = getDatabase();
      const kits = await db.getBarcodeKits();

      return Response.json({
        success: true,
        data: kits,
      });
    } catch (error) {
      console.error("获取Barcode试剂盒列表失败:", error);
      return Response.json(
        { error: "获取Barcode试剂盒列表失败" },
        { status: 500 },
      );
    }
  },
});

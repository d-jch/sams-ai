import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";
import { canAccessRequest, requireAuth } from "../../../../lib/permissions.ts";
import type { User } from "../../../../lib/types.ts";

export const handler = define.handlers({
  // GET /api/v1/plates?requestId=xxx - 获取申请的板布局列表
  async GET(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const url = new URL(ctx.req.url);
    const requestId = url.searchParams.get("requestId");

    if (!requestId) {
      return Response.json(
        { error: "requestId 参数为必填项" },
        { status: 400 },
      );
    }

    try {
      // 检查申请访问权限
      const accessCheck = await canAccessRequest(user, requestId);
      if (accessCheck !== true) return accessCheck;

      const db = getDatabase();
      const plates = await db.getPlateLayoutsByRequestId(requestId);

      return Response.json({
        success: true,
        data: plates,
      });
    } catch (error) {
      console.error("获取板布局列表失败:", error);
      return Response.json(
        { error: "获取板布局列表失败" },
        { status: 500 },
      );
    }
  },

  // POST /api/v1/plates - 创建新板布局（支持自动分配）
  async POST(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;

    // 只有技术员及以上可以创建板布局
    if (!["technician", "lab_manager", "admin"].includes(user.role)) {
      return Response.json(
        { error: "只有技术员及以上角色可以创建板布局" },
        { status: 403 },
      );
    }

    try {
      const body = await ctx.req.json();

      // 验证必填字段
      if (!body.requestId || !body.plateName) {
        return Response.json(
          { error: "requestId 和 plateName 为必填项" },
          { status: 400 },
        );
      }

      const db = getDatabase();

      // 验证申请是否存在
      const request = await db.getRequestById(body.requestId);
      if (!request) {
        return Response.json({ error: "申请不存在" }, { status: 404 });
      }

      // 创建板布局
      const plateType = body.plateType || "96-well";
      const plate = await db.createPlateLayout({
        requestId: body.requestId,
        plateName: body.plateName,
        plateType,
        createdBy: user.id,
      });

      // 如果提供了样品ID列表，自动分配孔位
      if (body.sampleIds && Array.isArray(body.sampleIds)) {
        const wellAssignments = await autoAssignWells(
          db,
          plate.id,
          body.sampleIds,
          body.strategy || "row-first",
        );

        return Response.json({
          success: true,
          data: {
            plate,
            wellAssignments,
          },
        }, { status: 201 });
      }

      return Response.json({
        success: true,
        data: plate,
      }, { status: 201 });
    } catch (error) {
      console.error("创建板布局失败:", error);
      return Response.json(
        { error: "创建板布局失败" },
        { status: 500 },
      );
    }
  },
});

// 自动分配孔位策略
async function autoAssignWells(
  db: ReturnType<typeof getDatabase>,
  plateLayoutId: string,
  sampleIds: string[],
  strategy: string,
) {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const cols = Array.from(
    { length: 12 },
    (_, i) => String(i + 1).padStart(2, "0"),
  );

  const wellAssignments = [];

  if (strategy === "row-first") {
    // 按行优先分配（A01, A02, ... A12, B01, B02, ...）
    let index = 0;
    for (const row of rows) {
      for (const col of cols) {
        if (index >= sampleIds.length) break;
        const wellPosition = `${row}${col}`;
        const assignment = await db.createWellAssignment({
          plateLayoutId,
          sampleId: sampleIds[index],
          wellPosition,
        });
        wellAssignments.push(assignment);
        index++;
      }
      if (index >= sampleIds.length) break;
    }
  } else if (strategy === "column-first") {
    // 按列优先分配（A01, B01, ... H01, A02, B02, ...）
    let index = 0;
    for (const col of cols) {
      for (const row of rows) {
        if (index >= sampleIds.length) break;
        const wellPosition = `${row}${col}`;
        const assignment = await db.createWellAssignment({
          plateLayoutId,
          sampleId: sampleIds[index],
          wellPosition,
        });
        wellAssignments.push(assignment);
        index++;
      }
      if (index >= sampleIds.length) break;
    }
  } else if (strategy === "skip-edges") {
    // 跳过边缘孔（避免边缘效应）
    const innerRows = rows.slice(1, -1); // B-G
    const innerCols = cols.slice(1, -1); // 02-11
    let index = 0;

    for (const row of innerRows) {
      for (const col of innerCols) {
        if (index >= sampleIds.length) break;
        const wellPosition = `${row}${col}`;
        const assignment = await db.createWellAssignment({
          plateLayoutId,
          sampleId: sampleIds[index],
          wellPosition,
        });
        wellAssignments.push(assignment);
        index++;
      }
      if (index >= sampleIds.length) break;
    }

    if (index < sampleIds.length) {
      throw new Error(
        `样品数量(${sampleIds.length})超过可用内部孔位数量(60)`,
      );
    }
  }

  return wellAssignments;
}

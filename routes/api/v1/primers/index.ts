import { define } from "../../../../utils.ts";
import { getDatabase } from "../../../../lib/db.ts";
import { requireAuth } from "../../../../lib/permissions.ts";
import {
  calculateGCContent,
  calculateTm,
  validateGCContent,
  validatePrimerLength,
  validatePrimerSequence,
  validateTm,
} from "../../../../lib/validation.ts";
import type { User } from "../../../../lib/types.ts";

export const handler = define.handlers({
  // GET /api/v1/primers - 获取引物列表
  async GET(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    try {
      const db = getDatabase();
      const primers = await db.getPrimers();

      return Response.json({
        success: true,
        data: primers,
      });
    } catch (error) {
      console.error("获取引物列表失败:", error);
      return Response.json(
        { error: "获取引物列表失败" },
        { status: 500 },
      );
    }
  },

  // POST /api/v1/primers - 创建新引物
  async POST(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;

    // 只有技术员及以上可以创建引物
    if (!["technician", "lab_manager", "admin"].includes(user.role)) {
      return Response.json(
        { error: "只有技术员及以上角色可以创建引物" },
        { status: 403 },
      );
    }

    try {
      const body = await ctx.req.json();

      // 验证必填字段
      if (!body.name || !body.sequence) {
        return Response.json(
          { error: "引物名称和序列为必填项" },
          { status: 400 },
        );
      }

      // 验证序列
      if (!validatePrimerSequence(body.sequence)) {
        return Response.json(
          { error: "引物序列只能包含 A、T、G、C" },
          { status: 400 },
        );
      }

      // 验证长度
      if (!validatePrimerLength(body.sequence)) {
        return Response.json(
          { error: "引物长度必须在 18-30 bp 之间" },
          { status: 400 },
        );
      }

      // 自动计算 GC 含量和 Tm（如果未提供）
      const gcContent = body.gcContent ?? calculateGCContent(body.sequence);
      const tm = body.tm ?? calculateTm(body.sequence);

      // 验证 GC 含量
      if (!validateGCContent(gcContent)) {
        return Response.json(
          { error: "GC 含量必须在 0-100% 之间" },
          { status: 400 },
        );
      }

      // 验证 Tm
      if (!validateTm(tm)) {
        return Response.json(
          { error: "Tm 值必须在 0-100°C 之间" },
          { status: 400 },
        );
      }

      const db = getDatabase();

      // 检查引物名称是否已存在
      const existing = await db.getPrimerByName(body.name);
      if (existing) {
        return Response.json(
          { error: "引物名称已存在" },
          { status: 409 },
        );
      }

      const primer = await db.createPrimer({
        name: body.name,
        sequence: body.sequence.toUpperCase(),
        description: body.description,
        tm,
        gcContent,
      });

      return Response.json({
        success: true,
        data: primer,
      }, { status: 201 });
    } catch (error) {
      console.error("创建引物失败:", error);
      return Response.json(
        { error: "创建引物失败" },
        { status: 500 },
      );
    }
  },
});

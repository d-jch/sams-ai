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
  // GET /api/v1/primers/:id - 获取引物详情
  async GET(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const { id } = ctx.params;

    try {
      const db = getDatabase();
      const primer = await db.getPrimerById(id);

      if (!primer) {
        return Response.json({ error: "引物不存在" }, { status: 404 });
      }

      return Response.json({
        success: true,
        data: primer,
      });
    } catch (error) {
      console.error("获取引物详情失败:", error);
      return Response.json(
        { error: "获取引物详情失败" },
        { status: 500 },
      );
    }
  },

  // PATCH /api/v1/primers/:id - 更新引物
  async PATCH(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    // 只有技术员及以上可以更新引物
    if (!["technician", "lab_manager", "admin"].includes(user.role)) {
      return Response.json(
        { error: "只有技术员及以上角色可以更新引物" },
        { status: 403 },
      );
    }

    try {
      const body = await ctx.req.json();
      const db = getDatabase();

      // 检查引物是否存在
      const existing = await db.getPrimerById(id);
      if (!existing) {
        return Response.json({ error: "引物不存在" }, { status: 404 });
      }

      // 如果更新序列，需要验证
      if (body.sequence) {
        if (!validatePrimerSequence(body.sequence)) {
          return Response.json(
            { error: "引物序列只能包含 A、T、G、C" },
            { status: 400 },
          );
        }

        if (!validatePrimerLength(body.sequence)) {
          return Response.json(
            { error: "引物长度必须在 18-30 bp 之间" },
            { status: 400 },
          );
        }

        // 序列更新时自动重新计算 GC 含量和 Tm（如果未提供）
        body.gcContent = body.gcContent ?? calculateGCContent(body.sequence);
        body.tm = body.tm ?? calculateTm(body.sequence);
        body.sequence = body.sequence.toUpperCase();
      }

      // 验证 GC 含量（如果提供）
      if (body.gcContent !== undefined && !validateGCContent(body.gcContent)) {
        return Response.json(
          { error: "GC 含量必须在 0-100% 之间" },
          { status: 400 },
        );
      }

      // 验证 Tm（如果提供）
      if (body.tm !== undefined && !validateTm(body.tm)) {
        return Response.json(
          { error: "Tm 值必须在 0-100°C 之间" },
          { status: 400 },
        );
      }

      // 如果更新名称，检查是否与其他引物冲突
      if (body.name && body.name !== existing.name) {
        const nameConflict = await db.getPrimerByName(body.name);
        if (nameConflict) {
          return Response.json(
            { error: "引物名称已存在" },
            { status: 409 },
          );
        }
      }

      const updated = await db.updatePrimer(id, {
        name: body.name,
        sequence: body.sequence,
        description: body.description,
        tm: body.tm,
        gcContent: body.gcContent,
      });

      return Response.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error("更新引物失败:", error);
      return Response.json(
        { error: "更新引物失败" },
        { status: 500 },
      );
    }
  },

  // DELETE /api/v1/primers/:id - 删除引物
  async DELETE(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    // 只有管理员可以删除引物
    if (!["lab_manager", "admin"].includes(user.role)) {
      return Response.json(
        { error: "只有管理员可以删除引物" },
        { status: 403 },
      );
    }

    try {
      const db = getDatabase();

      const primer = await db.getPrimerById(id);
      if (!primer) {
        return Response.json({ error: "引物不存在" }, { status: 404 });
      }

      const deleted = await db.deletePrimer(id);

      if (!deleted) {
        return Response.json({ error: "删除失败" }, { status: 500 });
      }

      return Response.json({
        success: true,
        message: "引物已删除",
      });
    } catch (error) {
      console.error("删除引物失败:", error);

      // 检查是否因为外键约束失败（引物正在使用中）
      const err = error as { code?: string };
      if (err.code === "23503") {
        return Response.json(
          { error: "该引物正在使用中，无法删除" },
          { status: 409 },
        );
      }

      return Response.json(
        { error: "删除引物失败" },
        { status: 500 },
      );
    }
  },
});

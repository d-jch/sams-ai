import { define } from "../../../../../utils.ts";
import { getDatabase } from "../../../../../lib/db.ts";
import { requireAuth } from "../../../../../lib/permissions.ts";
import type { User } from "../../../../../lib/types.ts";

export const handler = define.handlers({
  // POST /api/v1/requests/:id/delete - 删除申请
  async POST(ctx) {
    const authCheck = requireAuth(ctx);
    if (authCheck) return authCheck;

    const user = ctx.state.user as User;
    const { id } = ctx.params;

    try {
      const db = getDatabase();

      // 获取申请详情
      const request = await db.getRequestById(id);
      if (!request) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/requests?error=${encodeURIComponent("申请不存在")}`,
          },
        });
      }

      // 检查权限：只有申请创建者可以删除
      if (request.userId !== user.id && user.role !== "admin") {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/requests/${id}?error=${
              encodeURIComponent("无权删除此申请")
            }`,
          },
        });
      }

      // 检查状态：只有待处理状态可以删除
      if (request.status !== "pending") {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/requests/${id}?error=${
              encodeURIComponent("只有待处理状态的申请可以删除")
            }`,
          },
        });
      }

      // 删除申请（数据库级联删除相关样品）
      const deleted = await db.deleteRequest(id);

      if (deleted) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/requests?success=${encodeURIComponent("申请已删除")}`,
          },
        });
      } else {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/requests/${id}?error=${encodeURIComponent("删除失败")}`,
          },
        });
      }
    } catch (error) {
      console.error("删除申请失败:", error);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/requests/${id}?error=${encodeURIComponent("删除失败")}`,
        },
      });
    }
  },
});

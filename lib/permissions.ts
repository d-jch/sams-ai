import type { User, UserRole } from "./types.ts";
import { getDatabase } from "./db.ts";

/**
 * 权限控制工具库
 * 提供基于角色的访问控制 (RBAC) 函数
 */

// 定义通用的上下文类型
interface AuthContext {
  state: {
    user?: User | null;
  };
}

// 角色层级定义（数字越大权限越高）
const ROLE_HIERARCHY: Record<UserRole, number> = {
  researcher: 1,
  technician: 2,
  lab_manager: 3,
  admin: 4,
};

/**
 * 检查用户是否有指定角色或更高权限
 */
export function hasRole(user: User, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * 检查用户是否有任意一个指定角色
 */
export function hasAnyRole(user: User, roles: UserRole[]): boolean {
  return roles.some((role) => user.role === role);
}

/**
 * 中间件：要求用户必须登录
 */
export function requireAuth(ctx: AuthContext): Response | void {
  const user = ctx.state.user;
  if (!user) {
    return Response.json({ error: "未授权" }, { status: 401 });
  }
}

/**
 * 中间件：要求用户具有指定角色或更高权限
 */
export function requireRole(requiredRole: UserRole) {
  return (ctx: AuthContext): Response | void => {
    const user = ctx.state.user;
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    if (!hasRole(user, requiredRole)) {
      return Response.json(
        { error: "权限不足" },
        { status: 403 },
      );
    }
  };
}

/**
 * 中间件：要求用户具有任意一个指定角色
 */
export function requireAnyRole(roles: UserRole[]) {
  return (ctx: AuthContext): Response | void => {
    const user = ctx.state.user;
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    if (!hasAnyRole(user, roles)) {
      return Response.json(
        {
          error: "权限不足",
          required: `需要以下角色之一: ${roles.join(", ")}`,
        },
        { status: 403 },
      );
    }
  };
}

/**
 * 检查用户是否可以访问指定的测序申请
 * @returns true 如果可以访问，否则返回错误响应
 */
export async function canAccessRequest(
  user: User,
  requestId: string,
): Promise<true | Response> {
  // 管理员和实验室主管可以访问所有申请
  if (user.role === "admin" || user.role === "lab_manager") {
    return true;
  }

  const db = getDatabase();
  const request = await db.getRequestById(requestId);

  if (!request) {
    return Response.json({ error: "申请不存在" }, { status: 404 });
  }

  // 技术员可以查看所有申请（用于样品处理）
  if (user.role === "technician") {
    return true;
  }

  // 科研人员只能访问自己的申请
  if (request.userId !== user.id) {
    return Response.json({ error: "无权访问此申请" }, { status: 403 });
  }

  return true;
}

/**
 * 检查用户是否可以修改指定的测序申请
 * @returns true 如果可以修改，否则返回错误响应
 */
export async function canModifyRequest(
  user: User,
  requestId: string,
): Promise<true | Response> {
  // 管理员和实验室主管可以修改所有申请
  if (user.role === "admin" || user.role === "lab_manager") {
    return true;
  }

  const db = getDatabase();
  const request = await db.getRequestById(requestId);

  if (!request) {
    return Response.json({ error: "申请不存在" }, { status: 404 });
  }

  // 只有申请创建者可以修改
  if (request.userId !== user.id) {
    return Response.json({ error: "无权修改此申请" }, { status: 403 });
  }

  // 如果申请不是 pending 状态，普通用户不能修改
  if (request.status !== "pending") {
    return Response.json(
      { error: "申请已审核，无法修改" },
      { status: 403 },
    );
  }

  return true;
}

/**
 * 检查用户是否可以修改申请状态
 * @returns true 如果可以修改，否则返回错误响应
 */
export async function canModifyRequestStatus(
  user: User,
  requestId: string,
): Promise<true | Response> {
  // 只有实验室主管和管理员可以修改状态
  if (user.role !== "admin" && user.role !== "lab_manager") {
    return Response.json(
      { error: "只有实验室主管和管理员可以修改申请状态" },
      { status: 403 },
    );
  }

  const db = getDatabase();
  const request = await db.getRequestById(requestId);

  if (!request) {
    return Response.json({ error: "申请不存在" }, { status: 404 });
  }

  return true;
}

/**
 * 检查用户是否可以访问指定的样品
 * @returns true 如果可以访问，否则返回错误响应
 */
export async function canAccessSample(
  user: User,
  sampleId: string,
): Promise<true | Response> {
  const db = getDatabase();
  const sample = await db.getSampleById(sampleId);

  if (!sample) {
    return Response.json({ error: "样品不存在" }, { status: 404 });
  }

  // 通过关联的申请检查权限
  return await canAccessRequest(user, sample.requestId);
}

/**
 * 检查用户是否可以修改指定的样品
 * @returns true 如果可以修改，否则返回错误响应
 */
export async function canModifySample(
  user: User,
  sampleId: string,
): Promise<true | Response> {
  const db = getDatabase();
  const sample = await db.getSampleById(sampleId);

  if (!sample) {
    return Response.json({ error: "样品不存在" }, { status: 404 });
  }

  const request = await db.getRequestById(sample.requestId);

  if (!request) {
    return Response.json({ error: "关联申请不存在" }, { status: 404 });
  }

  // 管理员、实验室主管和技术员可以修改样品
  if (
    user.role === "admin" ||
    user.role === "lab_manager" ||
    user.role === "technician"
  ) {
    return true;
  }

  // 申请创建者可以修改基本信息
  if (request.userId === user.id) {
    return true;
  }

  return Response.json({ error: "无权修改此样品" }, { status: 403 });
}

/**
 * 检查用户是否可以修改样品的 QC 状态
 * @returns true 如果可以修改，否则返回错误响应
 */
export function canModifyQCStatus(user: User): true | Response {
  // 只有技术员、实验室主管和管理员可以修改 QC 状态
  if (
    user.role === "admin" ||
    user.role === "lab_manager" ||
    user.role === "technician"
  ) {
    return true;
  }

  return Response.json(
    { error: "只有技术员、实验室主管和管理员可以修改 QC 状态" },
    { status: 403 },
  );
}

/**
 * 组合多个中间件
 */
export function composeMiddleware(
  ...middlewares: Array<
    (ctx: AuthContext) => Response | void | Promise<Response | void>
  >
) {
  return async (ctx: AuthContext): Promise<Response | void> => {
    for (const middleware of middlewares) {
      const result = await middleware(ctx);
      if (result instanceof Response) {
        return result;
      }
    }
  };
}

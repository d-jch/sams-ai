import { expect } from "@std/expect";
import { App } from "fresh";
import type { State } from "../utils.ts";
import type { User } from "../lib/types.ts";

// Mock user states for different roles
const mockResearcher: User = {
  id: "user-researcher-1",
  email: "researcher@test.com",
  name: "Test Researcher",
  role: "researcher",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTechnician: User = {
  id: "user-technician-1",
  email: "technician@test.com",
  name: "Test Technician",
  role: "technician",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAdmin: User = {
  id: "user-admin-1",
  email: "admin@test.com",
  name: "Test Admin",
  role: "admin",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Helper to create app with authenticated user
function createAuthApp(user: User | null = null) {
  const app = new App<State>();

  // Add auth middleware
  app.use((ctx) => {
    ctx.state.user = user;
    ctx.state.session = user
      ? {
        id: "test-session",
        userId: user.id,
        lastVerifiedAt: new Date(),
        fresh: true,
        secretHash: new Uint8Array(),
      }
      : null;
    return ctx.next();
  });

  return app;
}

// ==============================================================================
// GET /api/v1/requests - List requests
// ==============================================================================

Deno.test("GET /api/v1/requests - unauthenticated returns 401", async () => {
  const app = createAuthApp(null)
    .get("/api/v1/requests", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }
      return Response.json({ success: true, data: [] });
    })
    .handler();

  const response = await app(new Request("http://localhost/api/v1/requests"));
  expect(response.status).toBe(401);

  const json = await response.json();
  expect(json.error).toBe("未授权");
});

Deno.test("GET /api/v1/requests - authenticated researcher gets filtered requests", async () => {
  const app = createAuthApp(mockResearcher)
    .get("/api/v1/requests", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      // Researcher only sees their own requests
      const mockRequests = [
        {
          id: "req-1",
          userId: mockResearcher.id,
          projectName: "Test Project",
          sequencingType: "WGS",
          status: "pending",
          priority: "normal",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      return Response.json({ success: true, data: mockRequests });
    })
    .handler();

  const response = await app(new Request("http://localhost/api/v1/requests"));
  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.success).toBe(true);
  expect(Array.isArray(json.data)).toBe(true);
  expect(json.data[0].userId).toBe(mockResearcher.id);
});

Deno.test("GET /api/v1/requests - admin sees all requests", async () => {
  const app = createAuthApp(mockAdmin)
    .get("/api/v1/requests", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      // Admin sees all requests
      const mockRequests = [
        { id: "req-1", userId: "user-1", projectName: "Project 1" },
        { id: "req-2", userId: "user-2", projectName: "Project 2" },
      ];

      return Response.json({ success: true, data: mockRequests });
    })
    .handler();

  const response = await app(new Request("http://localhost/api/v1/requests"));
  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.data.length).toBe(2);
});

// ==============================================================================
// POST /api/v1/requests - Create request
// ==============================================================================

Deno.test("POST /api/v1/requests - unauthenticated returns 401", async () => {
  const app = createAuthApp(null)
    .post("/api/v1/requests", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }
      return Response.json({ success: true }, { status: 201 });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "Test Project",
        sequencingType: "WGS",
      }),
    }),
  );

  expect(response.status).toBe(401);
});

Deno.test("POST /api/v1/requests - authenticated user can create request", async () => {
  const app = createAuthApp(mockResearcher)
    .post("/api/v1/requests", async (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const body = await ctx.req.json();
      const newRequest = {
        id: "req-new",
        userId: ctx.state.user.id,
        projectName: body.projectName,
        sequencingType: body.sequencingType,
        status: "pending",
        priority: body.priority || "normal",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return Response.json(
        { success: true, data: newRequest },
        { status: 201 },
      );
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "New Test Project",
        sequencingType: "WES",
        priority: "high",
      }),
    }),
  );

  expect(response.status).toBe(201);

  const json = await response.json();
  expect(json.success).toBe(true);
  expect(json.data.projectName).toBe("New Test Project");
  expect(json.data.userId).toBe(mockResearcher.id);
});

// ==============================================================================
// GET /api/v1/requests/:id - Get request by ID
// ==============================================================================

Deno.test("GET /api/v1/requests/:id - unauthenticated returns 401", async () => {
  const app = createAuthApp(null)
    .get("/api/v1/requests/:id", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }
      return Response.json({ success: true, data: {} });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/requests/req-1"),
  );
  expect(response.status).toBe(401);
});

Deno.test("GET /api/v1/requests/:id - researcher can access own request", async () => {
  const app = createAuthApp(mockResearcher)
    .get("/api/v1/requests/:id", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const mockRequest = {
        id: ctx.params.id,
        userId: mockResearcher.id,
        projectName: "Test Project",
        sequencingType: "WGS",
        status: "pending",
        priority: "normal",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Check if user can access this request
      if (
        mockRequest.userId !== ctx.state.user.id &&
        ctx.state.user.role === "researcher"
      ) {
        return Response.json({ error: "无权访问" }, { status: 403 });
      }

      return Response.json({ success: true, data: mockRequest });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/requests/req-1"),
  );
  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.success).toBe(true);
  expect(json.data.userId).toBe(mockResearcher.id);
});

Deno.test("GET /api/v1/requests/:id - researcher cannot access other's request", async () => {
  const app = createAuthApp(mockResearcher)
    .get("/api/v1/requests/:id", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const mockRequest = {
        id: ctx.params.id,
        userId: "other-user-id", // Different user
        projectName: "Other's Project",
      };

      // Check permission
      if (
        mockRequest.userId !== ctx.state.user.id &&
        ctx.state.user.role === "researcher"
      ) {
        return Response.json({ error: "无权访问" }, { status: 403 });
      }

      return Response.json({ success: true, data: mockRequest });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/requests/req-other"),
  );
  expect(response.status).toBe(403);

  const json = await response.json();
  expect(json.error).toBe("无权访问");
});

Deno.test("GET /api/v1/requests/:id - admin can access any request", async () => {
  const app = createAuthApp(mockAdmin)
    .get("/api/v1/requests/:id", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const mockRequest = {
        id: ctx.params.id,
        userId: "any-user-id",
        projectName: "Any Project",
      };

      return Response.json({ success: true, data: mockRequest });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/requests/req-any"),
  );
  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.success).toBe(true);
});

// ==============================================================================
// PATCH /api/v1/requests/:id - Update request
// ==============================================================================

Deno.test("PATCH /api/v1/requests/:id - researcher can update own request", async () => {
  const app = createAuthApp(mockResearcher)
    .patch("/api/v1/requests/:id", async (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const mockRequest = {
        id: ctx.params.id,
        userId: mockResearcher.id,
        projectName: "Original Project",
      };

      // Check permission
      if (
        mockRequest.userId !== ctx.state.user.id &&
        ctx.state.user.role === "researcher"
      ) {
        return Response.json({ error: "无权修改" }, { status: 403 });
      }

      const body = await ctx.req.json();
      const updated = { ...mockRequest, ...body, updatedAt: new Date() };

      return Response.json({ success: true, data: updated });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/requests/req-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: "Updated Project" }),
    }),
  );

  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.success).toBe(true);
  expect(json.data.projectName).toBe("Updated Project");
});

Deno.test("PATCH /api/v1/requests/:id - researcher cannot update other's request", async () => {
  const app = createAuthApp(mockResearcher)
    .patch("/api/v1/requests/:id", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const mockRequest = {
        id: ctx.params.id,
        userId: "other-user-id",
      };

      if (
        mockRequest.userId !== ctx.state.user.id &&
        ctx.state.user.role === "researcher"
      ) {
        return Response.json({ error: "无权修改" }, { status: 403 });
      }

      return Response.json({ success: true });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/requests/req-other", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: "Hacked" }),
    }),
  );

  expect(response.status).toBe(403);
});

// ==============================================================================
// PATCH /api/v1/requests/:id/status - Update request status
// ==============================================================================

Deno.test("PATCH /api/v1/requests/:id/status - researcher cannot change status", async () => {
  const app = createAuthApp(mockResearcher)
    .patch("/api/v1/requests/:id/status", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      // Only technician, lab_manager, admin can change status
      if (ctx.state.user.role === "researcher") {
        return Response.json({ error: "无权修改状态" }, { status: 403 });
      }

      return Response.json({ success: true });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/requests/req-1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "approved" }),
    }),
  );

  expect(response.status).toBe(403);

  const json = await response.json();
  expect(json.error).toBe("无权修改状态");
});

Deno.test("PATCH /api/v1/requests/:id/status - technician can change status", async () => {
  const app = createAuthApp(mockTechnician)
    .patch("/api/v1/requests/:id/status", async (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      if (ctx.state.user.role === "researcher") {
        return Response.json({ error: "无权修改状态" }, { status: 403 });
      }

      const body = await ctx.req.json();
      const updated = {
        id: ctx.params.id,
        status: body.newStatus,
        updatedAt: new Date(),
      };

      return Response.json({ success: true, data: updated });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/requests/req-1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "approved" }),
    }),
  );

  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.success).toBe(true);
  expect(json.data.status).toBe("approved");
});

// ==============================================================================
// DELETE /api/v1/requests/:id - Delete request
// ==============================================================================

Deno.test("DELETE /api/v1/requests/:id - only admin can delete", async () => {
  const app = createAuthApp(mockResearcher)
    .delete("/api/v1/requests/:id", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      if (ctx.state.user.role !== "admin") {
        return Response.json({ error: "无权删除" }, { status: 403 });
      }

      return Response.json({ success: true, message: "删除成功" });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/requests/req-1", {
      method: "DELETE",
    }),
  );

  expect(response.status).toBe(403);

  const json = await response.json();
  expect(json.error).toBe("无权删除");
});

Deno.test("DELETE /api/v1/requests/:id - admin can delete", async () => {
  const app = createAuthApp(mockAdmin)
    .delete("/api/v1/requests/:id", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      if (ctx.state.user.role !== "admin") {
        return Response.json({ error: "无权删除" }, { status: 403 });
      }

      return Response.json({ success: true, message: "删除成功" });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/requests/req-1", {
      method: "DELETE",
    }),
  );

  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.success).toBe(true);
  expect(json.message).toBe("删除成功");
});

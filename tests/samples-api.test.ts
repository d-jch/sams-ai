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

const mockLabManager: User = {
  id: "user-lab-manager-1",
  email: "labmanager@test.com",
  name: "Test Lab Manager",
  role: "lab_manager",
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
// GET /api/v1/samples - List samples
// ==============================================================================

Deno.test("GET /api/v1/samples - unauthenticated returns 401", async () => {
  const app = createAuthApp(null)
    .get("/api/v1/samples", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }
      return Response.json({ success: true, data: [] });
    })
    .handler();

  const response = await app(new Request("http://localhost/api/v1/samples"));
  expect(response.status).toBe(401);

  const json = await response.json();
  expect(json.error).toBe("未授权");
});

Deno.test("GET /api/v1/samples - authenticated user can list samples", async () => {
  const app = createAuthApp(mockResearcher)
    .get("/api/v1/samples", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const mockSamples = [
        {
          id: "sample-1",
          requestId: "req-1",
          name: "Sample 1",
          type: "DNA",
          qcStatus: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      return Response.json({ success: true, data: mockSamples });
    })
    .handler();

  const response = await app(new Request("http://localhost/api/v1/samples"));
  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.success).toBe(true);
  expect(Array.isArray(json.data)).toBe(true);
});

Deno.test("GET /api/v1/samples - can filter by requestId", async () => {
  const app = createAuthApp(mockResearcher)
    .get("/api/v1/samples", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const url = new URL(ctx.req.url);
      const requestId = url.searchParams.get("requestId");

      const mockSamples = requestId
        ? [
          {
            id: "sample-1",
            requestId,
            name: "Filtered Sample",
            type: "DNA",
          },
        ]
        : [];

      return Response.json({ success: true, data: mockSamples });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/samples?requestId=req-123"),
  );
  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.data[0].requestId).toBe("req-123");
});

// ==============================================================================
// POST /api/v1/samples - Create sample
// ==============================================================================

Deno.test("POST /api/v1/samples - unauthenticated returns 401", async () => {
  const app = createAuthApp(null)
    .post("/api/v1/samples", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }
      return Response.json({ success: true }, { status: 201 });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/samples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Sample", type: "DNA" }),
    }),
  );

  expect(response.status).toBe(401);
});

Deno.test("POST /api/v1/samples - authenticated user can create sample", async () => {
  const app = createAuthApp(mockResearcher)
    .post("/api/v1/samples", async (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const body = await ctx.req.json();
      const newSample = {
        id: "sample-new",
        requestId: body.requestId,
        name: body.name,
        type: body.type,
        qcStatus: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return Response.json({ success: true, data: newSample }, { status: 201 });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/samples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "req-1",
        name: "New Sample",
        type: "RNA",
      }),
    }),
  );

  expect(response.status).toBe(201);

  const json = await response.json();
  expect(json.success).toBe(true);
  expect(json.data.name).toBe("New Sample");
  expect(json.data.type).toBe("RNA");
  expect(json.data.qcStatus).toBe("pending");
});

// ==============================================================================
// GET /api/v1/samples/:id - Get sample by ID
// ==============================================================================

Deno.test("GET /api/v1/samples/:id - unauthenticated returns 401", async () => {
  const app = createAuthApp(null)
    .get("/api/v1/samples/:id", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }
      return Response.json({ success: true, data: {} });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/samples/sample-1"),
  );
  expect(response.status).toBe(401);
});

Deno.test("GET /api/v1/samples/:id - authenticated user can get sample", async () => {
  const app = createAuthApp(mockResearcher)
    .get("/api/v1/samples/:id", (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const mockSample = {
        id: ctx.params.id,
        requestId: "req-1",
        name: "Test Sample",
        type: "DNA",
        qcStatus: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return Response.json({ success: true, data: mockSample });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/samples/sample-1"),
  );
  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.success).toBe(true);
  expect(json.data.id).toBe("sample-1");
});

// ==============================================================================
// PATCH /api/v1/samples/:id - Update sample
// ==============================================================================

Deno.test("PATCH /api/v1/samples/:id - researcher can update basic fields", async () => {
  const app = createAuthApp(mockResearcher)
    .patch("/api/v1/samples/:id", async (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const body = await ctx.req.json();

      // Researcher cannot modify QC status
      if (
        body.qcStatus &&
        !["technician", "lab_manager", "admin"].includes(ctx.state.user.role)
      ) {
        return Response.json(
          { error: "无权修改质检状态" },
          { status: 403 },
        );
      }

      const updated = {
        id: ctx.params.id,
        name: body.name || "Original Name",
        notes: body.notes,
        updatedAt: new Date(),
      };

      return Response.json({ success: true, data: updated });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/samples/sample-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Sample Name",
        notes: "Some notes",
      }),
    }),
  );

  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.success).toBe(true);
  expect(json.data.name).toBe("Updated Sample Name");
});

Deno.test("PATCH /api/v1/samples/:id - researcher cannot modify QC status", async () => {
  const app = createAuthApp(mockResearcher)
    .patch("/api/v1/samples/:id", async (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const body = await ctx.req.json();

      if (
        body.qcStatus &&
        !["technician", "lab_manager", "admin"].includes(ctx.state.user.role)
      ) {
        return Response.json(
          { error: "无权修改质检状态" },
          { status: 403 },
        );
      }

      return Response.json({ success: true });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/samples/sample-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qcStatus: "passed" }),
    }),
  );

  expect(response.status).toBe(403);

  const json = await response.json();
  expect(json.error).toBe("无权修改质检状态");
});

Deno.test("PATCH /api/v1/samples/:id - technician can modify QC status", async () => {
  const app = createAuthApp(mockTechnician)
    .patch("/api/v1/samples/:id", async (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const body = await ctx.req.json();

      if (
        body.qcStatus &&
        !["technician", "lab_manager", "admin"].includes(ctx.state.user.role)
      ) {
        return Response.json(
          { error: "无权修改质检状态" },
          { status: 403 },
        );
      }

      const updated = {
        id: ctx.params.id,
        qcStatus: body.qcStatus,
        updatedAt: new Date(),
      };

      return Response.json({ success: true, data: updated });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/samples/sample-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qcStatus: "passed" }),
    }),
  );

  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.success).toBe(true);
  expect(json.data.qcStatus).toBe("passed");
});

Deno.test("PATCH /api/v1/samples/:id - lab_manager can modify QC status", async () => {
  const app = createAuthApp(mockLabManager)
    .patch("/api/v1/samples/:id", async (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const body = await ctx.req.json();

      const updated = {
        id: ctx.params.id,
        qcStatus: body.qcStatus,
        updatedAt: new Date(),
      };

      return Response.json({ success: true, data: updated });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/samples/sample-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qcStatus: "failed" }),
    }),
  );

  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.data.qcStatus).toBe("failed");
});

Deno.test("PATCH /api/v1/samples/:id - admin can modify QC status", async () => {
  const app = createAuthApp(mockAdmin)
    .patch("/api/v1/samples/:id", async (ctx) => {
      if (!ctx.state.user) {
        return Response.json({ error: "未授权" }, { status: 401 });
      }

      const body = await ctx.req.json();

      const updated = {
        id: ctx.params.id,
        qcStatus: body.qcStatus,
        updatedAt: new Date(),
      };

      return Response.json({ success: true, data: updated });
    })
    .handler();

  const response = await app(
    new Request("http://localhost/api/v1/samples/sample-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qcStatus: "retest" }),
    }),
  );

  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.data.qcStatus).toBe("retest");
});

// ==============================================================================
// DELETE /api/v1/samples/:id - Delete sample
// ==============================================================================

Deno.test("DELETE /api/v1/samples/:id - only admin can delete", async () => {
  const app = createAuthApp(mockTechnician)
    .delete("/api/v1/samples/:id", (ctx) => {
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
    new Request("http://localhost/api/v1/samples/sample-1", {
      method: "DELETE",
    }),
  );

  expect(response.status).toBe(403);

  const json = await response.json();
  expect(json.error).toBe("无权删除");
});

Deno.test("DELETE /api/v1/samples/:id - admin can delete", async () => {
  const app = createAuthApp(mockAdmin)
    .delete("/api/v1/samples/:id", (ctx) => {
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
    new Request("http://localhost/api/v1/samples/sample-1", {
      method: "DELETE",
    }),
  );

  expect(response.status).toBe(200);

  const json = await response.json();
  expect(json.success).toBe(true);
  expect(json.message).toBe("删除成功");
});

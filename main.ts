import { App, staticFiles } from "fresh";
import { type State } from "@/utils.ts";
import { initializeDatabase, getDatabase } from "@/lib/db.ts";

export const app = new App<State>();

app.use(staticFiles());

// Initialize database connection
try {
  await initializeDatabase();
  console.log("🚀 Authentication system initialized");
} catch (error) {
  console.error("❌ Failed to initialize database:", error);
  Deno.exit(1);
}

// Pass a shared value from a middleware
app.use(async (ctx) => {
  ctx.state.shared = "hello";
  ctx.state.user = null;
  ctx.state.session = null;
  return await ctx.next();
});

// Include file-system based routes here
app.fsRoutes();

// Health check endpoint for monitoring and load balancers
app.get("/health", async (_ctx) => {
  const db = getDatabase();
  const isDbHealthy = await db.healthCheck();
  
  const status = isDbHealthy ? "healthy" : "unhealthy";
  const httpStatus = isDbHealthy ? 200 : 503;
  
  return Response.json({
    status,
    timestamp: new Date().toISOString(),
    service: "sams-ai-auth",
    version: "2.0.0",
    environment: Deno.env.get("DENO_ENV") || "development",
    components: {
      database: isDbHealthy ? "healthy" : "unhealthy",
      authentication: "healthy", // Always healthy if service is running
      sessions: "healthy" // Session system status
    },
    checks: {
      database_connection: isDbHealthy
    }
  }, { status: httpStatus });
});

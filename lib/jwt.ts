import { SignJWT, jwtVerify, type JWTPayload } from "@panva/jose";
import type { Session } from "./types.ts";

/**
 * JWT Session Token Manager
 * Implements stateless tokens for faster session validation with fallback to database
 */

export interface JWTConfig {
  /** JWT signing secret (32 bytes for HMAC-SHA256) */
  secret: Uint8Array;
  /** JWT expiration time in seconds (default: 5 minutes) */
  expirationSeconds: number;
  /** JWT issuer */
  issuer: string;
  /** JWT audience */
  audience: string;
}

export interface SessionJWTPayload extends JWTPayload {
  session: {
    id: string;
    userId: string;
    lastVerifiedAt: number; // Unix timestamp in seconds
    fresh: boolean;
  };
}

export class JWTSessionManager {
  private config: JWTConfig;
  private algorithm = "HS256"; // HMAC SHA-256

  constructor(config: JWTConfig) {
    this.config = config;
  }

  /**
   * Create a short-lived JWT for the session (reduces database queries)
   */
  async createSessionJWT(session: Session): Promise<string> {
    const now = Math.floor(Date.now() / 1000); // Current Unix timestamp

    const payload: SessionJWTPayload = {
      // Standard JWT claims
      iss: this.config.issuer,
      aud: this.config.audience,
      iat: now,
      exp: now + this.config.expirationSeconds,
      
      // Custom session data (exclude sensitive secretHash)
      session: {
        id: session.id,
        userId: session.userId,
        lastVerifiedAt: Math.floor(session.lastVerifiedAt.getTime() / 1000),
        fresh: session.fresh,
      },
    };

    return await new SignJWT(payload)
      .setProtectedHeader({ alg: this.algorithm })
      .sign(this.config.secret);
  }

  /**
   * Validate and parse a session JWT
   * Returns the session data if valid, null if invalid/expired
   */
  async validateSessionJWT(jwt: string): Promise<Session | null> {
    try {
      const { payload } = await jwtVerify(jwt, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: [this.algorithm],
      });

      const sessionPayload = payload as SessionJWTPayload;
      
      // Validate session structure
      if (!sessionPayload.session || 
          typeof sessionPayload.session.id !== "string" ||
          typeof sessionPayload.session.userId !== "string" ||
          typeof sessionPayload.session.lastVerifiedAt !== "number" ||
          typeof sessionPayload.session.fresh !== "boolean") {
        return null;
      }

      // Convert back to Session object
      const session: Session = {
        id: sessionPayload.session.id,
        userId: sessionPayload.session.userId,
        lastVerifiedAt: new Date(sessionPayload.session.lastVerifiedAt * 1000),
        fresh: sessionPayload.session.fresh,
        secretHash: new Uint8Array(), // JWT doesn't contain secret hash for security
      };

      return session;
    } catch (error) {
      // JWT validation failed (expired, invalid signature, etc.)
      console.debug("JWT validation failed:", error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Generate a secure random key for JWT signing
   */
  static generateSecretKey(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32)); // 32 bytes = 256 bits
  }
}

// Singleton JWT manager
let jwtManager: JWTSessionManager | null = null;

export function getJWTSessionManager(): JWTSessionManager {
  if (!jwtManager) {
    // Get JWT secret from environment or generate one (for development)
    const jwtSecretEnv = Deno.env.get("JWT_SECRET");
    let jwtSecret: Uint8Array;

    if (jwtSecretEnv) {
      // Decode base64 secret from environment
      jwtSecret = Uint8Array.from(atob(jwtSecretEnv), c => c.charCodeAt(0));
    } else {
      // Development: Generate a random key (will invalidate JWTs on restart)
      console.warn("⚠️ No JWT_SECRET environment variable found. Using random key for development.");
      jwtSecret = JWTSessionManager.generateSecretKey();
    }

    jwtManager = new JWTSessionManager({
      secret: jwtSecret,
      expirationSeconds: 5 * 60, // 5 minutes (short-lived for security)
      issuer: "sams-ai-auth",
      audience: "sams-ai-users",
    });
  }

  return jwtManager;
}
import { hash, Variant, verify } from "@felix/argon2";

export class PasswordManager {
  private memoryCost: number;
  private timeCost: number;
  private parallelism: number;

  constructor() {
    // Get configuration from environment variables with sensible defaults
    this.memoryCost = parseInt(Deno.env.get("ARGON2_MEMORY_COST") || "65536"); // 64MB in KB
    this.timeCost = parseInt(Deno.env.get("ARGON2_TIME_COST") || "3"); // 3 iterations
    this.parallelism = parseInt(Deno.env.get("ARGON2_PARALLELISM") || "1"); // 1 lane
  }

  /**
   * Hash a password using Argon2id
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hashedPassword = await hash(password, {
        memoryCost: this.memoryCost, // memory cost in KB
        timeCost: this.timeCost, // time cost (iterations)
        lanes: this.parallelism, // parallelism (lanes)
        variant: Variant.Argon2id, // Use Argon2id variant
      });

      return hashedPassword;
    } catch (error) {
      console.error("Error hashing password:", error);
      throw new Error("Failed to hash password");
    }
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await verify(hashedPassword, password);
    } catch (error) {
      console.error("Error verifying password:", error);
      return false;
    }
  }

  /**
   * Check if a hash needs to be updated (rehashed) due to changed parameters
   * This is useful for migrating to stronger parameters over time
   */
  needsRehash(hashedPassword: string): boolean {
    try {
      // Parse the hash to check current parameters
      const parts = hashedPassword.split("$");
      if (parts.length < 6) return true; // Invalid format, needs rehash

      const params = parts[3].split(",");
      const currentMemoryCost = parseInt(
        params.find((p) => p.startsWith("m="))?.substring(2) || "0",
      );
      const currentTimeCost = parseInt(
        params.find((p) => p.startsWith("t="))?.substring(2) || "0",
      );
      const currentParallelism = parseInt(
        params.find((p) => p.startsWith("p="))?.substring(2) || "0",
      );

      // Check if current parameters are weaker than desired
      return (
        currentMemoryCost < this.memoryCost ||
        currentTimeCost < this.timeCost ||
        currentParallelism < this.parallelism
      );
    } catch {
      // If we can't parse the hash, assume it needs rehashing
      return true;
    }
  }

  /**
   * Get current configuration for logging/debugging
   */
  getConfig() {
    return {
      memoryCost: this.memoryCost,
      timeCost: this.timeCost,
      parallelism: this.parallelism,
      memoryMB: Math.round(this.memoryCost / 1024),
    };
  }
}

/**
 * Session Token Manager for Lucia-style dual-token security
 * Implements ID + Secret pattern to prevent timing attacks
 */
export class SessionTokenManager {
  /**
   * Generate cryptographically secure random string for session IDs and secrets
   */
  generateSecureRandomString(length: number = 32): string {
    const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // Human-readable chars
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    let result = "";
    for (let i = 0; i < bytes.length; i++) {
      result += alphabet[bytes[i] % alphabet.length];
    }
    return result;
  }

  /**
   * Hash a session secret using SHA-256 for constant-time verification
   */
  async hashSecret(secret: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hashBuffer);
  }

  /**
   * Generate a session token in format: <SESSION_ID>.<SESSION_SECRET>
   */
  async generateSessionToken(): Promise<{
    id: string;
    secret: string;
    secretHash: Uint8Array;
    token: string;
  }> {
    const id = this.generateSecureRandomString(24); // Session ID
    const secret = this.generateSecureRandomString(32); // Session Secret
    const secretHash = await this.hashSecret(secret);
    const token = `${id}.${secret}`;

    return { id, secret, secretHash, token };
  }

  /**
   * Validate session token and return components
   */
  parseSessionToken(
    token: string,
  ): { sessionId: string; sessionSecret: string } | null {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [sessionId, sessionSecret] = parts;
    if (!sessionId || !sessionSecret) return null;

    return { sessionId, sessionSecret };
  }

  /**
   * Constant-time comparison to prevent timing attacks
   */
  constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.byteLength !== b.byteLength) return false;

    let result = 0;
    for (let i = 0; i < a.byteLength; i++) {
      result |= a[i] ^ b[i]; // XOR accumulation
    }
    return result === 0;
  }

  /**
   * Verify session secret against stored hash (constant-time)
   */
  async verifySessionSecret(
    providedSecret: string,
    storedSecretHash: Uint8Array,
  ): Promise<boolean> {
    const providedHash = await this.hashSecret(providedSecret);
    return this.constantTimeEqual(providedHash, storedSecretHash);
  }
}

// Singleton instances
let passwordManager: PasswordManager | null = null;
let sessionTokenManager: SessionTokenManager | null = null;

export function getPasswordManager(): PasswordManager {
  if (!passwordManager) {
    passwordManager = new PasswordManager();
  }
  return passwordManager;
}

export function getSessionTokenManager(): SessionTokenManager {
  if (!sessionTokenManager) {
    sessionTokenManager = new SessionTokenManager();
  }
  return sessionTokenManager;
}

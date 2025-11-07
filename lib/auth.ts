import { getDatabase } from "./db.ts";
import { getPasswordManager, getSessionTokenManager } from "./crypto.ts";
import { getJWTSessionManager } from "./jwt.ts";
import type {
  AuthConfig,
  CreateUserData,
  LoginCredentials,
  Session,
  SessionValidationResult,
  User,
} from "./types.ts";

// Session ID generation is now handled by SessionTokenManager

/**
 * Main authentication class following Lucia-style patterns
 */
export class Auth {
  private config: AuthConfig;
  private db = getDatabase();
  private passwordManager = getPasswordManager();

  // Public getter for configuration (for testing/debugging)
  get authConfig(): AuthConfig {
    return this.config;
  }

  constructor(config?: Partial<AuthConfig>) {
    this.config = {
      sessionIdLength: config?.sessionIdLength ?? 32,
      inactivityTimeoutMs: config?.inactivityTimeoutMs ??
        (10 * 24 * 60 * 60 * 1000), // 10 days
      activityCheckIntervalMs: config?.activityCheckIntervalMs ??
        (60 * 60 * 1000), // 1 hour
      argon2MemoryCost: config?.argon2MemoryCost ?? 65536, // 64MB
      argon2TimeCost: config?.argon2TimeCost ?? 3,
      argon2Parallelism: config?.argon2Parallelism ?? 1,
    };
  }

  /**
   * Create a new user account
   */
  async createUser(userData: CreateUserData): Promise<User> {
    // Check if user already exists
    const existingUser = await this.db.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash the password
    const passwordHash = await this.passwordManager.hashPassword(
      userData.password,
    );

    // Create the user
    const user = await this.db.createUser({
      email: userData.email,
      name: userData.name,
      password: userData.password,
      role: userData.role, // Pass role to database
      passwordHash,
    });

    return user;
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(credentials: LoginCredentials): Promise<User | null> {
    const userWithPassword = await this.db.getUserByEmailWithPassword(
      credentials.email,
    );

    if (!userWithPassword) {
      return null;
    }

    const isValidPassword = await this.passwordManager.verifyPassword(
      credentials.password,
      userWithPassword.passwordHash,
    );

    if (!isValidPassword) {
      return null;
    }

    // Return user without password hash
    const { passwordHash: _, ...user } = userWithPassword;
    return user;
  }

  /**
   * Create a new session for a user using dual-token security
   * Returns session object, main token, and short-lived JWT for performance
   */
  async createSession(userId: string): Promise<{
    session: Session;
    token: string;
    jwt: string;
  }> {
    const sessionTokenManager = getSessionTokenManager();
    const tokenData = await sessionTokenManager.generateSessionToken();
    const now = new Date();

    const session = await this.db.createSession(
      tokenData.id,
      userId,
      now, // lastVerifiedAt is set to current time
      tokenData.secretHash,
    );

    // Create short-lived JWT for performance optimization
    const jwtManager = getJWTSessionManager();
    const jwt = await jwtManager.createSessionJWT(session);

    return {
      session,
      token: tokenData.token,
      jwt,
    };
  }

  /**
   * Validate a JWT session token (fast path - no database query)
   */
  async validateSessionJWT(jwt: string): Promise<SessionValidationResult> {
    const jwtManager = getJWTSessionManager();
    const session = await jwtManager.validateSessionJWT(jwt);

    if (!session) {
      return { session: null, user: null };
    }

    // For JWT validation, we trust the token contents (no DB query for performance)
    // But we still need the user data
    const user = await this.db.getUserById(session.userId);

    if (!user) {
      // User was deleted - JWT is now invalid
      return { session: null, user: null };
    }

    return { session, user };
  }

  /**
   * Validate a session token and return the session with user data
   * This is the fallback when JWT validation fails
   */
  async validateSession(token: string): Promise<SessionValidationResult> {
    if (!token) {
      return { session: null, user: null };
    }

    const sessionTokenManager = getSessionTokenManager();
    const tokenParts = sessionTokenManager.parseSessionToken(token);

    if (!tokenParts) {
      return { session: null, user: null };
    }

    const session = await this.db.getSessionById(tokenParts.sessionId);

    if (!session) {
      return { session: null, user: null };
    }

    // Verify the session secret using constant-time comparison
    const isValidSecret = await sessionTokenManager.verifySessionSecret(
      tokenParts.sessionSecret,
      session.secretHash,
    );

    if (!isValidSecret) {
      return { session: null, user: null };
    }

    const now = new Date();

    // Check inactivity timeout - delete session if inactive too long
    if (
      now.getTime() - session.lastVerifiedAt.getTime() >=
        this.config.inactivityTimeoutMs
    ) {
      await this.invalidateSession(session.id);
      return { session: null, user: null };
    }

    const user = await this.db.getUserById(session.userId);

    if (!user) {
      // User was deleted, clean up session
      await this.invalidateSession(session.id);
      return { session: null, user: null };
    }

    // Update lastVerifiedAt if enough time has passed (reduces DB load)
    const timeSinceLastVerification = now.getTime() -
      session.lastVerifiedAt.getTime();
    if (timeSinceLastVerification >= this.config.activityCheckIntervalMs) {
      session.lastVerifiedAt = now;
      await this.db.updateSessionLastVerified(session.id, now);

      // Perform automatic cleanup occasionally during session validation
      // This spreads cleanup load across requests rather than requiring cron jobs
      if (Math.random() < 0.01) { // 1% chance per session validation
        this.performBackgroundCleanup().catch((err: unknown) => {
          console.error("Background session cleanup failed:", err);
        });
      }
    }

    // Session is fresh if it was last verified within 24 hours
    const isFresh = timeSinceLastVerification < (24 * 60 * 60 * 1000); // 24 hours

    return {
      session: { ...session, fresh: isFresh },
      user,
    };
  }

  /**
   * Invalidate (delete) a specific session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    await this.db.deleteSession(sessionId);
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    await this.db.deleteUserSessions(userId);
  }

  /**
   * Clean up inactive sessions (should be run periodically)
   * Removes sessions that haven't been verified within the inactivity timeout period
   */
  async cleanupInactiveSessions(): Promise<number> {
    const cutoffTime = new Date(Date.now() - this.config.inactivityTimeoutMs);
    return await this.db.cleanupInactiveSessions(cutoffTime);
  }

  /**
   * Background cleanup helper - runs asynchronously without blocking request
   * This spreads session cleanup across normal app usage rather than requiring cron jobs
   */
  private async performBackgroundCleanup(): Promise<void> {
    try {
      const cleaned = await this.cleanupInactiveSessions();
      if (cleaned > 0) {
        console.log(
          `🧹 Background cleanup removed ${cleaned} inactive sessions`,
        );
      }
    } catch (error) {
      console.error("Failed to perform background session cleanup:", error);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return await this.db.getUserById(userId);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await this.db.getUserByEmail(email);
  }

  /**
   * Register a user and create a session in one operation
   */
  async registerAndLogin(
    userData: CreateUserData,
  ): Promise<{ user: User; sessionToken: string; jwt: string }> {
    const user = await this.createUser(userData);
    const { token, jwt } = await this.createSession(user.id);
    return { user, sessionToken: token, jwt };
  }

  /**
   * Login user and create session in one operation
   */
  async loginUser(
    credentials: LoginCredentials,
  ): Promise<{ user: User; sessionToken: string; jwt: string } | null> {
    const user = await this.authenticateUser(credentials);

    if (!user) {
      return null;
    }

    const { token, jwt } = await this.createSession(user.id);
    return { user, sessionToken: token, jwt };
  }
}

// Singleton auth instance
let auth: Auth | null = null;

export function getAuth(): Auth {
  if (!auth) {
    auth = new Auth();
  }
  return auth;
}

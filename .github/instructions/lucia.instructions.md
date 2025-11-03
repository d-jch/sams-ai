---
description: Lucia Auth Inspired Authentication System Architecture Guide
alwaysApply: true
applyTo: "**/{auth,session,oauth,security}/**,**/middleware.ts,**/routes/api/auth/**,**/lib/{auth,session,security}/**,**/islands/**,main.ts,deno.json,fresh.gen.ts"
downloadedFrom: https://github.com/lucia-auth/lucia
version: v4.0.x
frameworks: ["Deno", "Fresh 2", "Next.js", "SvelteKit", "Astro"]
databases: ["PostgreSQL", "SQLite", "MySQL"]
features: ["Sessions", "Stateless Tokens", "JWT", "OAuth", "2FA", "Rate Limiting", "Security", "Cookies", "Middleware", "Database Management", "User Management", "Environment Config", "Testing"]
securityLevel: "Production-Ready"
patterns: 17
principles: ["Security-First", "Education-Over-Abstraction", "Framework-Agnostic-Core", "Constant-Time-Operations"]
lastUpdated: "2024-10-31"
---

# Copilot Authentication System Architecture Guide

## Role Definition

You are an **expert authentication system architect**, specializing in building secure, production-ready authentication systems inspired by **Lucia Auth** principles, implemented natively using **Deno + Fresh 2 + PostgreSQL**.

## Core Design Philosophy

### 1. Education Over Abstraction
- **Teach concepts, not black boxes**: Always explain the "why" behind security decisions
- **Code transparency**: Developers should understand every line of authentication code
- **No magic**: Avoid hidden behaviors that developers can't inspect or modify

### 2. Security-First Architecture
- **Defense in depth**: Multiple layers of security, never rely on single protection
- **Fail secure**: When systems fail, they should deny access by default  
- **Constant-time operations**: Prevent timing attacks through consistent execution time
- **Cryptographically secure randomness**: Never use `Math.random()` for security purposes

### 3. Framework-Agnostic Core with Adaptation Layers
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Fresh 2 Web   │    │   SvelteKit      │    │    Next.js      │
│   Framework     │    │   Framework      │    │   Framework     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                               │
                ┌──────────────────────────────────┐
                │      Adaptation Layer            │
                │   (Framework-specific cookies,   │
                │    routing, middleware)          │
                └──────────────────────────────────┘
                               │
                ┌──────────────────────────────────┐
                │         Core Auth Engine         │
                │  (Sessions, OAuth, 2FA, etc.)   │
                │     Framework Independent        │
                └──────────────────────────────────┘
                               │
                ┌──────────────────────────────────┐
                │      Database Abstraction        │
                │    (PostgreSQL, SQLite, etc.)   │
                └──────────────────────────────────┘
```

## Implementation Patterns

### Pattern 1: Dual-Token Session Security
```typescript
// Core Principle: ID + Secret prevents timing attacks
interface Session {
    id: string;           // Public identifier
    secretHash: Uint8Array; // Hashed secret for verification
    userId?: number;
    createdAt: Date;
    lastVerifiedAt: Date;
}

// Token Format: <SESSION_ID>.<SESSION_SECRET>
// Why: Separates identification from verification
const sessionToken = `${sessionId}.${sessionSecret}`;
```

### Pattern 2: Constant-Time Security Operations
```typescript
// Always use constant-time comparison for security-critical operations
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.byteLength !== b.byteLength) return false;
    
    let result = 0;
    for (let i = 0; i < a.byteLength; i++) {
        result |= a[i] ^ b[i]; // XOR accumulation
    }
    return result === 0;
}

// Why: Prevents timing attacks that could reveal valid tokens
```

### Pattern 3: Cryptographically Secure Random Generation
```typescript
// Use Web Crypto API for security-sensitive random values
function generateSecureRandomString(): string {
    const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // Human-readable
    const bytes = new Uint8Array(24); // 192 bits of entropy
    crypto.getRandomValues(bytes);
    
    let result = "";
    for (let i = 0; i < bytes.length; i++) {
        result += alphabet[bytes[i] >> 3]; // 5 bits per character = 120 bits total
    }
    return result;
}
```

### Pattern 4: Stateless Tokens (JWT) for Performance Optimization
```typescript
// Hybrid approach: Short-lived JWTs + Stateful sessions for invalidation capability
// Use case: Reduce database queries for frequently accessed sessions

interface SessionJWT {
    session: {
        id: string;
        userId?: number;
        createdAt: number; // Unix timestamp
    };
    iat: number; // Issued at
    exp: number; // Expires at (max 5 minutes)
}

export class StatelessTokenManager {
    private jwtKey: Uint8Array; // 32 bytes for HMAC-SHA256
    
    constructor(key: Uint8Array) {
        if (key.length !== 32) {
            throw new Error('JWT key must be exactly 32 bytes for HMAC-SHA256');
        }
        this.jwtKey = key;
    }
    
    // Create short-lived JWT (1-5 minutes max)
    async createSessionJWT(session: Session): Promise<string> {
        const now = Math.floor(Date.now() / 1000);
        const expirationSeconds = 300; // 5 minutes maximum
        
        const header = { alg: "HS256", typ: "JWT" };
        const payload: SessionJWT = {
            session: {
                id: session.id,
                userId: session.userId,
                createdAt: Math.floor(session.createdAt.getTime() / 1000)
            },
            iat: now,
            exp: now + expirationSeconds
        };
        
        const headerB64 = this.base64UrlEncode(JSON.stringify(header));
        const payloadB64 = this.base64UrlEncode(JSON.stringify(payload));
        const headerAndPayload = `${headerB64}.${payloadB64}`;
        
        // HMAC-SHA256 signature
        const key = await crypto.subtle.importKey(
            'raw',
            this.jwtKey,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            new TextEncoder().encode(headerAndPayload)
        );
        
        const signatureB64 = this.base64UrlEncode(signature);
        return `${headerAndPayload}.${signatureB64}`;
    }
    
    // Validate JWT (fails if expired or tampered)
    async validateSessionJWT(jwt: string): Promise<SessionJWT | null> {
        try {
            const parts = jwt.split('.');
            if (parts.length !== 3) return null;
            
            const [headerB64, payloadB64, signatureB64] = parts;
            
            // Verify signature first
            const headerAndPayload = `${headerB64}.${payloadB64}`;
            const expectedSignature = new Uint8Array(this.base64UrlDecode(signatureB64));
            
            const key = await crypto.subtle.importKey(
                'raw',
                this.jwtKey,
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['verify']
            );
            
            const isValid = await crypto.subtle.verify(
                'HMAC',
                key,
                expectedSignature,
                new TextEncoder().encode(headerAndPayload)
            );
            
            if (!isValid) return null;
            
            // Parse and validate payload
            const payload = JSON.parse(new TextDecoder().decode(this.base64UrlDecode(payloadB64))) as SessionJWT;
            
            // Check expiration
            const now = Math.floor(Date.now() / 1000);
            if (now >= payload.exp) return null;
            
            // Validate structure
            if (!payload.session?.id || typeof payload.session.id !== 'string') {
                return null;
            }
            
            return payload;
            
        } catch (error) {
            // Any parsing error means invalid JWT
            return null;
        }
    }
    
    // Hybrid validation: Try JWT first, fallback to database session
    async validateHybridSession(
        sessionToken: string,
        sessionJWT: string | null,
        sessionManager: SessionManager
    ): Promise<Session | null> {
        // First, try to validate JWT (fast path)
        if (sessionJWT) {
            const jwtPayload = await this.validateSessionJWT(sessionJWT);
            if (jwtPayload) {
                // JWT is valid, return session data from JWT
                return {
                    id: jwtPayload.session.id,
                    secretHash: new Uint8Array(), // Not included in JWT for security
                    userId: jwtPayload.session.userId,
                    createdAt: new Date(jwtPayload.session.createdAt * 1000),
                    lastVerifiedAt: new Date(), // Current time
                };
            }
        }
        
        // JWT invalid/expired, fallback to database session validation
        const session = await sessionManager.validate(sessionToken);
        if (session) {
            // Create new JWT for next requests
            const newJWT = await this.createSessionJWT(session);
            
            // Return session with new JWT (caller should set it in response)
            return {
                ...session,
                newJWT // Add this for the caller to set as cookie
            };
        }
        
        return null;
    }
    
    private base64UrlEncode(data: string | ArrayBuffer): string {
        let base64: string;
        if (typeof data === 'string') {
            base64 = btoa(data);
        } else {
            base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
        }
        return base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
    
    private base64UrlDecode(str: string): ArrayBuffer {
        // Add padding if necessary
        str += '='.repeat((4 - (str.length % 4)) % 4);
        // Convert base64url to base64
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        // Decode base64 to binary string, then to ArrayBuffer
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// Usage Example: Hybrid Session Validation Middleware
export async function hybridSessionMiddleware(ctx: FreshContext): Promise<Response | void> {
    const sessionToken = getCookie(ctx.req.headers, 'session');
    const sessionJWT = getCookie(ctx.req.headers, 'session_jwt');
    
    if (!sessionToken) {
        // No session at all
        return new Response('Unauthorized', { status: 401 });
    }
    
    const jwtManager = new StatelessTokenManager(getJWTKey());
    const sessionManager = new SessionManager(getDatabase());
    
    const session = await jwtManager.validateHybridSession(
        sessionToken,
        sessionJWT,
        sessionManager
    );
    
    if (!session) {
        // Invalid session
        return new Response('Unauthorized', { status: 401 });
    }
    
    // Set new JWT if one was generated
    if ('newJWT' in session) {
        const response = new Response();
        setCookie(response.headers, {
            name: 'session_jwt',
            value: session.newJWT,
            httpOnly: true,
            secure: Deno.env.get('DENO_ENV') === 'production',
            sameSite: 'Lax',
            maxAge: 300 // 5 minutes
        });
        ctx.state.session = session;
        ctx.state.pendingResponse = response;
    } else {
        ctx.state.session = session;
    }
}

// Key Security Principles for Stateless Tokens:
// 1. NEVER make JWTs long-lived (max 5 minutes)
// 2. ALWAYS have a stateful session as backup for invalidation
// 3. NEVER include secret hashes in JWTs
// 4. ALWAYS verify JWT signature before parsing payload
// 5. USE proper base64url encoding (not standard base64)
// 6. STORE JWT signing key securely (32 bytes minimum for HMAC-SHA256)
```

## Database Schema Patterns

### Core Tables Architecture
```sql
-- Sessions: The heart of stateful authentication
CREATE TABLE session (
    id TEXT PRIMARY KEY,                    -- Public session identifier
    secret_hash BYTEA NOT NULL,            -- SHA-256 hash of secret
    user_id INTEGER REFERENCES users(id),  -- Optional user association
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,               -- Optional expiration
    metadata JSONB DEFAULT '{}'           -- Extensible session data
);

-- Users: Flexible identity storage
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    password_hash TEXT,                   -- bcrypt with 12+ rounds
    github_id BIGINT UNIQUE,             -- OAuth provider IDs
    google_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT,              -- TOTP secret (encrypted)
    recovery_codes_hash TEXT[]           -- Hashed backup codes
);

-- OAuth State Management
CREATE TABLE oauth_state (
    state TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    code_verifier TEXT,                  -- PKCE code verifier
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Performance Indexes
CREATE INDEX idx_session_user_id ON session(user_id);
CREATE INDEX idx_session_expires_at ON session(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_oauth_state_expires_at ON oauth_state(expires_at);
```

## Security Implementation Patterns

### Pattern 4: Session Lifecycle Management
```typescript
// Deno + Fresh 2 Implementation
export class SessionManager {
    private db: PostgresPool;
    
    async create(userId?: number, metadata?: Record<string, any>): Promise<SessionWithToken> {
        const id = generateSecureRandomString();
        const secret = generateSecureRandomString();
        const secretHash = await this.hashSecret(secret);
        
        const session = {
            id,
            secretHash,
            userId,
            createdAt: new Date(),
            lastVerifiedAt: new Date(),
            metadata: metadata || {},
            token: `${id}.${secret}` // Client receives this
        };
        
        await this.db.query(`
            INSERT INTO session (id, secret_hash, user_id, created_at, last_verified_at, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            session.id,
            session.secretHash,
            session.userId,
            session.createdAt,
            session.lastVerifiedAt,
            JSON.stringify(session.metadata)
        ]);
        
        return session;
    }
    
    async validate(token: string): Promise<Session | null> {
        const [sessionId, sessionSecret] = token.split('.');
        if (!sessionId || !sessionSecret) return null;
        
        // Fetch session (includes timing attack protection)
        const session = await this.getSession(sessionId);
        if (!session) return null;
        
        // Constant-time secret verification
        const providedHash = await this.hashSecret(sessionSecret);
        if (!constantTimeEqual(providedHash, session.secretHash)) {
            return null;
        }
        
        // Check expiration and inactivity
        if (this.isExpired(session) || this.isInactive(session)) {
            await this.delete(sessionId);
            return null;
        }
        
        // Update activity tracking (batched to reduce DB load)
        if (this.shouldUpdateActivity(session)) {
            await this.updateLastVerified(sessionId);
        }
        
        return session;
    }
}
```

### Pattern 5: OAuth Flow Security
```typescript
// PKCE + State Parameter Implementation
export class OAuthManager {
    async initiateGitHubFlow(ctx: FreshContext): Promise<Response> {
        // Generate cryptographically secure state
        const state = generateSecureRandomString();
        const codeVerifier = this.generateCodeVerifier();
        
        // Store state with expiration (10 minutes)
        await this.storeOAuthState(state, 'github', codeVerifier);
        
        // Build authorization URL
        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.set('client_id', Deno.env.get('GITHUB_CLIENT_ID')!);
        authUrl.searchParams.set('redirect_uri', this.getRedirectUri(ctx));
        authUrl.searchParams.set('scope', 'user:email');
        authUrl.searchParams.set('state', state);
        
        // Set secure state cookie
        const response = new Response(null, {
            status: 302,
            headers: { Location: authUrl.toString() }
        });
        
        this.setSecureCookie(response, 'oauth_state', state, {
            maxAge: 600, // 10 minutes
            httpOnly: true,
            secure: Deno.env.get('DENO_ENV') === 'production',
            sameSite: 'Lax'
        });
        
        return response;
    }
    
    async handleGitHubCallback(ctx: FreshContext): Promise<Response> {
        const url = new URL(ctx.request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        
        // Validate state parameter (CSRF protection)
        const storedState = this.getCookie(ctx.request, 'oauth_state');
        if (!state || !storedState || state !== storedState) {
            throw new Error('Invalid OAuth state');
        }
        
        // Verify and consume stored state
        const oauthData = await this.verifyOAuthState(state);
        if (!oauthData || oauthData.provider !== 'github') {
            throw new Error('Invalid OAuth session');
        }
        
        // Exchange code for tokens
        const tokens = await this.exchangeCodeForTokens(code!, oauthData.codeVerifier);
        const githubUser = await this.fetchGitHubUser(tokens.accessToken);
        
        // Find or create user
        let user = await this.findUserByGitHubId(githubUser.id);
        if (!user) {
            user = await this.createUserFromGitHub(githubUser);
        }
        
        // Create authenticated session
        const session = await this.sessionManager.create(user.id);
        
        // Set session cookie and redirect
        const response = new Response(null, {
            status: 302,
            headers: { Location: '/' }
        });
        
        this.setSessionCookie(response, session.token, session.expiresAt);
        return response;
    }
}
```

## Fresh 2 Integration Patterns

### Pattern 6: Middleware Integration
```typescript
// _middleware.ts - Fresh 2 middleware
export async function handler(ctx: FreshContext, next: () => Promise<Response>) {
    // CSRF Protection
    if (!isOriginAllowed(ctx.request)) {
        return new Response('Forbidden', { status: 403 });
    }
    
    // Session validation
    const sessionToken = getSessionCookie(ctx.request);
    if (sessionToken) {
        const session = await sessionManager.validate(sessionToken);
        if (session) {
            ctx.state.session = session;
            ctx.state.user = session.userId ? 
                await userService.getById(session.userId) : null;
        }
    }
    
    const response = await next();
    
    // Refresh session cookie if exists
    if (sessionToken && ctx.state.session) {
        setSessionCookie(response, sessionToken, ctx.state.session.expiresAt);
    }
    
    // Security headers
    setSecurityHeaders(response);
    
    return response;
}
```

### Pattern 7: Route Handlers
```typescript
// routes/api/auth/login.ts
export async function handler(req: Request, ctx: FreshContext): Promise<Response> {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }
    
    // Rate limiting
    const clientIP = getClientIP(req);
    if (!loginRateLimit.consume(clientIP)) {
        return new Response(
            JSON.stringify({ error: 'Too many attempts' }), 
            { status: 429 }
        );
    }
    
    const { email, password } = await req.json();
    
    // Input validation
    if (!isValidEmail(email) || !password) {
        return new Response(
            JSON.stringify({ error: 'Invalid input' }), 
            { status: 400 }
        );
    }
    
    // User authentication
    const user = await userService.authenticate(email, password);
    if (!user) {
        // Log failed attempt
        logger.securityEvent('LOGIN_FAILED', { email, ip: clientIP });
        return new Response(
            JSON.stringify({ error: 'Invalid credentials' }), 
            { status: 401 }
        );
    }
    
    // Check 2FA requirement
    if (user.twoFactorEnabled) {
        // Store pending authentication
        const pendingToken = await createPendingAuth(user.id);
        return new Response(
            JSON.stringify({ 
                requiresTwoFactor: true, 
                pendingToken 
            }), 
            { status: 200 }
        );
    }
    
    // Create session
    const session = await sessionManager.create(user.id);
    
    // Success response with session cookie
    const response = new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
    setSessionCookie(response, session.token, session.expiresAt);
    
    logger.info('LOGIN_SUCCESS', { userId: user.id, ip: clientIP });
    return response;
}
```

## Advanced Security Patterns

### Pattern 8: Two-Factor Authentication
```typescript
export class TOTPManager {
    static generateSecret(): string {
        const bytes = new Uint8Array(20); // 160-bit secret
        crypto.getRandomValues(bytes);
        return this.base32Encode(bytes);
    }
    
    static async generateTOTP(secret: string, timeStep?: number): Promise<string> {
        const time = Math.floor((timeStep || Date.now()) / 1000 / 30);
        const timeBuffer = new ArrayBuffer(8);
        const timeView = new DataView(timeBuffer);
        timeView.setUint32(4, time); // Big-endian
        
        const key = await crypto.subtle.importKey(
            'raw',
            this.base32Decode(secret),
            { name: 'HMAC', hash: 'SHA-1' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', key, timeBuffer);
        const hash = new Uint8Array(signature);
        
        const offset = hash[19] & 0xf;
        const code = ((hash[offset] & 0x7f) << 24) |
                    ((hash[offset + 1] & 0xff) << 16) |
                    ((hash[offset + 2] & 0xff) << 8) |
                    (hash[offset + 3] & 0xff);
                    
        return (code % 1000000).toString().padStart(6, '0');
    }
    
    static async verifyTOTP(secret: string, token: string, window: number = 1): Promise<boolean> {
        const now = Date.now();
        for (let i = -window; i <= window; i++) {
            const timeStep = now + (i * 30 * 1000);
            const expectedToken = await this.generateTOTP(secret, timeStep);
            if (constantTimeEqual(
                new TextEncoder().encode(token),
                new TextEncoder().encode(expectedToken)
            )) {
                return true;
            }
        }
        return false;
    }
}
```

### Pattern 9: Rate Limiting with Token Bucket
```typescript
export class TokenBucketRateLimit<K = string> {
    private buckets = new Map<K, { tokens: number; lastRefill: number }>();
    
    constructor(
        private maxTokens: number,
        private refillRateMs: number,
        private tokensPerRefill: number = 1
    ) {}
    
    consume(key: K, tokensRequired: number = 1): boolean {
        const now = Date.now();
        let bucket = this.buckets.get(key);
        
        if (!bucket) {
            bucket = { tokens: this.maxTokens, lastRefill: now };
            this.buckets.set(key, bucket);
        }
        
        // Calculate tokens to add based on elapsed time
        const elapsed = now - bucket.lastRefill;
        const refillsElapsed = Math.floor(elapsed / this.refillRateMs);
        const tokensToAdd = refillsElapsed * this.tokensPerRefill;
        
        bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
        bucket.lastRefill += refillsElapsed * this.refillRateMs;
        
        if (bucket.tokens >= tokensRequired) {
            bucket.tokens -= tokensRequired;
            return true;
        }
        
        return false;
    }
}

// Usage in authentication endpoints
const loginRateLimit = new TokenBucketRateLimit<string>(
    5,      // Max 5 attempts
    60000,  // 1 minute refill interval
    1       // 1 token per minute
);
```

## Error Handling and Logging Patterns

### Pattern 10: Security-Aware Logging
```typescript
export class SecurityLogger {
    static async logAuthEvent(
        event: string, 
        context: AuthContext, 
        severity: 'low' | 'medium' | 'high' = 'medium'
    ): Promise<void> {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            severity,
            context: {
                userId: context.userId,
                sessionId: context.sessionId,
                ip: context.ip,
                userAgent: this.sanitizeUserAgent(context.userAgent),
                endpoint: context.endpoint
            }
        };
        
        // Console logging for development
        console.log(`[AUTH:${severity.toUpperCase()}] ${event}`, logEntry);
        
        // Send to monitoring system in production
        if (Deno.env.get('DENO_ENV') === 'production') {
            await this.sendToMonitoring(logEntry);
        }
        
        // Alert on high severity events
        if (severity === 'high') {
            await this.sendSecurityAlert(logEntry);
        }
    }
    
    private static sanitizeUserAgent(userAgent?: string): string {
        // Remove potentially sensitive information
        return userAgent?.substring(0, 200) || 'unknown';
    }
}

// Usage examples:
// SecurityLogger.logAuthEvent('LOGIN_SUCCESS', { userId: 123, ip: '1.2.3.4' });
// SecurityLogger.logAuthEvent('INVALID_SESSION_TOKEN', context, 'high');
// SecurityLogger.logAuthEvent('PASSWORD_RESET_REQUESTED', context, 'medium');
```

## Testing Patterns

### Pattern 11: Security Test Utilities
```typescript
export class AuthTestUtils {
    // Test timing attack resistance
    static async testConstantTimeComparison(): Promise<void> {
        const secret1 = new Uint8Array([1, 2, 3, 4, 5]);
        const secret2 = new Uint8Array([1, 2, 3, 4, 6]); // Different last byte
        const secret3 = new Uint8Array([6, 5, 4, 3, 2]); // All different
        
        const iterations = 10000;
        
        // Measure time for single-bit difference
        const start1 = performance.now();
        for (let i = 0; i < iterations; i++) {
            constantTimeEqual(secret1, secret2);
        }
        const time1 = performance.now() - start1;
        
        // Measure time for all-different
        const start2 = performance.now();
        for (let i = 0; i < iterations; i++) {
            constantTimeEqual(secret1, secret3);
        }
        const time2 = performance.now() - start2;
        
        // Times should be similar (within 10% tolerance)
        const timeDiff = Math.abs(time1 - time2);
        const tolerance = Math.max(time1, time2) * 0.1;
        
        if (timeDiff > tolerance) {
            throw new Error(`Timing attack vulnerability detected: ${timeDiff}ms difference`);
        }
    }
    
    // Test session security
    static async testSessionSecurity(sessionManager: SessionManager): Promise<void> {
        // Test 1: Invalid token format
        assert(await sessionManager.validate('invalid') === null);
        assert(await sessionManager.validate('invalid.token.format') === null);
        
        // Test 2: Non-existent session
        const fakeToken = 'nonexistent.fakesecretvalue';
        assert(await sessionManager.validate(fakeToken) === null);
        
        // Test 3: Tampered token
        const validSession = await sessionManager.create(1);
        const [id, secret] = validSession.token.split('.');
        const tamperedToken = `${id}.tampered${secret.slice(8)}`;
        assert(await sessionManager.validate(tamperedToken) === null);
        
        // Test 4: Expired session
        // (Implementation depends on how you handle expiration)
    }
}
```

### Fresh 2 Project Structure
```
auth-system/
├── deno.json                    # Deno configuration
├── main.ts                      # Application entry point
├── routes/
│   ├── _middleware.ts           # Global middleware
│   ├── _layout.tsx              # Layout component
│   ├── index.tsx                # Home page
│   ├── login.tsx                # Login page
│   ├── register.tsx             # Registration page
│   ├── dashboard.tsx            # Protected dashboard
│   └── api/
│       └── auth/
│           ├── _middleware.ts   # Auth API middleware
│           ├── login.ts         # Login endpoint
│           ├── register.ts      # Registration endpoint
│           ├── logout.ts        # Logout endpoint
│           ├── me.ts            # Current user endpoint
│           └── oauth/
│               ├── github.ts    # GitHub OAuth init
│               ├── google.ts    # Google OAuth init
│               └── callback/
│                   ├── github.ts # GitHub callback
│                   └── google.ts # Google callback
├── islands/                     # Client-side components
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── TwoFactorSetup.tsx
│   └── UserMenu.tsx
├── lib/
│   ├── auth/
│   │   ├── session.ts           # Session management
│   │   ├── oauth.ts             # OAuth providers
│   │   ├── totp.ts              # 2FA implementation
│   │   └── rate-limit.ts        # Rate limiting
│   ├── db/
│   │   ├── client.ts            # Database client
│   │   ├── migrations/          # Database migrations
│   │   └── queries/             # SQL queries
│   ├── security/
│   │   ├── crypto.ts            # Cryptographic utilities  
│   │   ├── validation.ts        # Input validation
│   │   └── middleware.ts        # Security middleware
│   └── utils/
│       ├── config.ts            # Configuration management
│       ├── logger.ts            # Logging utilities
│       └── email.ts             # Email service
├── static/                      # Static assets
├── components/                  # Server-side components
└── tests/                       # Test files
    ├── auth/
    ├── security/
    └── integration/
```

### Fresh 2 Authentication Plugin
```typescript
// lib/fresh-auth-plugin.ts - Custom Fresh 2 plugin for authentication
// main.ts - Fresh 2 application setup with auth plugin
```

### Environment Setup for Deno Deployment
```bash
# .env.example - Environment variables template
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/authdb

# Security Keys (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your-32-byte-encryption-key-base64-encoded
JWT_SIGNING_KEY=your-jwt-signing-key-base64-encoded

# Session Configuration
SESSION_DURATION_DAYS=30
INACTIVITY_TIMEOUT_DAYS=10

# OAuth Providers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Service
EMAIL_PROVIDER=smtp # or 'sendgrid', 'resend'
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Security Settings
ALLOWED_ORIGINS=http://localhost:8000,https://yourdomain.com
REQUIRE_EMAIL_VERIFICATION=true
ENFORCE_STRONG_PASSWORDS=true

# Rate Limiting
LOGIN_MAX_ATTEMPTS=5
LOGIN_WINDOW_MINUTES=15
REGISTRATION_MAX_ATTEMPTS=3
REGISTRATION_WINDOW_MINUTES=60

# Environment
DENO_ENV=development # or 'production'
LOG_LEVEL=info
```

### Deployment Configuration
```yaml
# docker-compose.yml - Local development setup
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/authdb
      - DENO_ENV=development
    depends_on:
      - db
    volumes:
      - .:/app
    working_dir: /app
    command: deno task dev
    
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=authdb
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  postgres_data:

# Dockerfile for production deployment
FROM denoland/deno:1.38.3

WORKDIR /app

# Copy dependency files
COPY deno.json deno.lock ./

# Cache dependencies
RUN deno cache --lock=deno.lock deno.json

# Copy source code
COPY . .

# Generate Fresh manifest
RUN deno task build

EXPOSE 8000

CMD ["deno", "task", "start"]
```

## Key Implementation Principles

### 1. **Fail Secure by Default**
```typescript
// Always return null/false on any error condition
async function validateSession(token: string): Promise<Session | null> {
    try {
        // ... validation logic
    } catch (error) {
        // Log error but don't expose details to client
        logger.error('Session validation failed', { error: error.message });
        return null; // Fail secure
    }
}
```

### 2. **Input Validation Everywhere**
```typescript
function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === 'string' && 
           email.length <= 254 && 
           emailRegex.test(email);
}
```

### 3. **Secure Defaults**
```typescript
interface CookieOptions {
    httpOnly: boolean = true;        // Prevent XSS
    secure: boolean = isProduction;  // HTTPS only in production
    sameSite: 'Strict' | 'Lax' = 'Lax'; // CSRF protection
    maxAge?: number;                 // Explicit expiration
    path: string = '/';              // Scope limitation
}
```

### 4. **Monitoring and Alerting**
```typescript
// Monitor authentication anomalies
class AuthMonitor {
    static async checkAnomalies(userId: number, context: AuthContext): Promise<void> {
        // Detect unusual login patterns
        const recentLogins = await getRecentLogins(userId, '24h');
        const unusualLocation = await detectUnusualLocation(context.ip, recentLogins);
        const rapidRequests = await detectRapidRequests(userId, '5m');
        
        if (unusualLocation || rapidRequests) {
            await SecurityLogger.logAuthEvent('ANOMALY_DETECTED', context, 'high');
            await notifyUser(userId, 'unusual_activity');
        }
    }
}
```

## Additional Essential Patterns

### Pattern 12: Session Cookie Management Across Frameworks
```typescript
// Framework-agnostic cookie utilities
export class CookieManager {
    static setSessionCookie(
        response: any, 
        token: string, 
        expiresAt: Date,
        framework: 'fresh' | 'nextjs' | 'sveltekit' = 'fresh'
    ): void {
        const cookieOptions = {
            httpOnly: true,
            secure: Deno.env.get('DENO_ENV') === 'production',
            sameSite: 'Lax' as const,
            path: '/',
            expires: expiresAt,
            maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000)
        };
        
        const cookieString = this.buildCookieString('session', token, cookieOptions);
        
        // Framework-specific cookie setting
        switch (framework) {
            case 'fresh':
                response.headers.set('Set-Cookie', cookieString);
                break;
            case 'nextjs':
                response.cookies.set('session', token, cookieOptions);
                break;
            case 'sveltekit':
                response.headers.append('Set-Cookie', cookieString);
                break;
        }
    }
    
    static deleteCookie(response: any, name: string = 'session'): void {
        const expiredCookieString = `${name}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
        response.headers.set('Set-Cookie', expiredCookieString);
    }
    
    private static buildCookieString(name: string, value: string, options: any): string {
        let cookie = `${name}=${value}`;
        
        if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
        if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
        if (options.httpOnly) cookie += `; HttpOnly`;
        if (options.secure) cookie += `; Secure`;
        if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
        if (options.path) cookie += `; Path=${options.path}`;
        if (options.domain) cookie += `; Domain=${options.domain}`;
        
        return cookie;
    }
    
    // Extract cookie from request
    static getCookie(request: Request, name: string): string | null {
        const cookieHeader = request.headers.get('Cookie');
        if (!cookieHeader) return null;
        
        const cookies = cookieHeader.split(';').map(c => c.trim());
        for (const cookie of cookies) {
            const [cookieName, cookieValue] = cookie.split('=');
            if (cookieName === name) {
                return decodeURIComponent(cookieValue);
            }
        }
        return null;
    }
}
```

### Pattern 13: Database Connection and Query Utilities
```typescript
// Database abstraction for PostgreSQL (adaptable to other DBs)
export class DatabaseManager {
    private pool: Pool;
    
    constructor(connectionString: string) {
        this.pool = new Pool(connectionString, {
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }
    
    async executeQuery<T = any>(
        sql: string, 
        params: any[] = []
    ): Promise<{ rows: T[]; rowCount: number }> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return {
                rows: result.rows,
                rowCount: result.rowCount || 0
            };
        } catch (error) {
            SecurityLogger.logAuthEvent('DATABASE_ERROR', {
                error: error.message,
                sql: this.sanitizeSQL(sql)
            }, 'high');
            throw error;
        } finally {
            client.release();
        }
    }
    
    async transaction<T>(
        callback: (client: PoolClient) => Promise<T>
    ): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    private sanitizeSQL(sql: string): string {
        // Remove potential sensitive data for logging
        return sql.substring(0, 100) + (sql.length > 100 ? '...' : '');
    }
}
```

### Pattern 14: User Management Service
```typescript
export class UserService {
    constructor(private db: DatabaseManager) {}
    
    async createUser(userData: {
        email?: string;
        username?: string;
        passwordHash?: string;
        githubId?: number;
        googleId?: string;
    }): Promise<User> {
        const now = new Date();
        
        return await this.db.transaction(async (client) => {
            const result = await client.query(`
                INSERT INTO users (email, username, password_hash, github_id, google_id, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, email, username, github_id, google_id, created_at, email_verified
            `, [
                userData.email || null,
                userData.username || null,
                userData.passwordHash || null,
                userData.githubId || null,
                userData.googleId || null,
                now
            ]);
            
            if (result.rows.length === 0) {
                throw new Error('Failed to create user');
            }
            
            return this.mapRowToUser(result.rows[0]);
        });
    }
    
    async findByEmail(email: string): Promise<User | null> {
        const result = await this.db.executeQuery(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    }
    
    async findByGitHubId(githubId: number): Promise<User | null> {
        const result = await this.db.executeQuery(
            'SELECT * FROM users WHERE github_id = $1',
            [githubId]
        );
        
        return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    }
    
    async findById(userId: number): Promise<User | null> {
        const result = await this.db.executeQuery(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );
        
        return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    }
    
    async updateEmailVerification(userId: number, verified: boolean): Promise<void> {
        await this.db.executeQuery(
            'UPDATE users SET email_verified = $1 WHERE id = $2',
            [verified, userId]
        );
    }
    
    async enable2FA(userId: number, secret: string): Promise<void> {
        const encryptedSecret = await this.encryptTOTPSecret(secret);
        await this.db.executeQuery(
            'UPDATE users SET two_factor_enabled = true, two_factor_secret = $1 WHERE id = $2',
            [encryptedSecret, userId]
        );
    }
    
    private mapRowToUser(row: any): User {
        return {
            id: row.id,
            email: row.email,
            username: row.username,
            githubId: row.github_id,
            googleId: row.google_id,
            createdAt: row.created_at,
            emailVerified: row.email_verified,
            twoFactorEnabled: row.two_factor_enabled
        };
    }
    
    private async encryptTOTPSecret(secret: string): Promise<string> {
        // Implementation depends on your encryption strategy
        // This is a placeholder - use proper encryption in production
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(Deno.env.get('ENCRYPTION_KEY')!),
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );
        
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            new TextEncoder().encode(secret)
        );
        
        return btoa(String.fromCharCode(...iv, ...new Uint8Array(encrypted)));
    }
}

interface User {
    id: number;
    email?: string;
    username?: string;
    githubId?: number;
    googleId?: string;
    createdAt: Date;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
}
```

### Pattern 15: Environment Configuration Management
```typescript
// config/auth.ts - Centralized configuration management
export interface AuthEnvironment {
    // Database
    databaseUrl: string;
    
    // Security Keys
    encryptionKey: string;
    jwtSigningKey: string;
    
    // Session Configuration
    sessionDurationDays: number;
    inactivityTimeoutDays: number;
    
    // OAuth Providers
    githubClientId?: string;
    githubClientSecret?: string;
    googleClientId?: string;
    googleClientSecret?: string;
    
    // Email Service
    emailProvider: 'smtp' | 'sendgrid' | 'resend';
    emailConfig: Record<string, string>;
    
    // Security Settings
    allowedOrigins: string[];
    requireEmailVerification: boolean;
    enforceStrongPasswords: boolean;
    
    // Rate Limiting
    loginRateLimit: { maxAttempts: number; windowMinutes: number };
    registrationRateLimit: { maxAttempts: number; windowMinutes: number };
    
    // Environment
    isProduction: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export class ConfigManager {
    private static instance: AuthEnvironment;
    
    static load(): AuthEnvironment {
        if (this.instance) return this.instance;
        
        // Validate required environment variables
        const required = [
            'DATABASE_URL',
            'ENCRYPTION_KEY',
            'JWT_SIGNING_KEY'
        ];
        
        for (const key of required) {
            if (!Deno.env.get(key)) {
                throw new Error(`Missing required environment variable: ${key}`);
            }
        }
        
        this.instance = {
            // Database
            databaseUrl: Deno.env.get('DATABASE_URL')!,
            
            // Security Keys
            encryptionKey: Deno.env.get('ENCRYPTION_KEY')!,
            jwtSigningKey: Deno.env.get('JWT_SIGNING_KEY')!,
            
            // Session Configuration
            sessionDurationDays: parseInt(Deno.env.get('SESSION_DURATION_DAYS') || '30'),
            inactivityTimeoutDays: parseInt(Deno.env.get('INACTIVITY_TIMEOUT_DAYS') || '10'),
            
            // OAuth
            githubClientId: Deno.env.get('GITHUB_CLIENT_ID'),
            githubClientSecret: Deno.env.get('GITHUB_CLIENT_SECRET'),
            googleClientId: Deno.env.get('GOOGLE_CLIENT_ID'),
            googleClientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
            
            // Email
            emailProvider: (Deno.env.get('EMAIL_PROVIDER') || 'smtp') as any,
            emailConfig: this.parseEmailConfig(),
            
            // Security
            allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:8000').split(','),
            requireEmailVerification: Deno.env.get('REQUIRE_EMAIL_VERIFICATION') === 'true',
            enforceStrongPasswords: Deno.env.get('ENFORCE_STRONG_PASSWORDS') !== 'false',
            
            // Rate Limiting
            loginRateLimit: {
                maxAttempts: parseInt(Deno.env.get('LOGIN_MAX_ATTEMPTS') || '5'),
                windowMinutes: parseInt(Deno.env.get('LOGIN_WINDOW_MINUTES') || '15')
            },
            registrationRateLimit: {
                maxAttempts: parseInt(Deno.env.get('REGISTRATION_MAX_ATTEMPTS') || '3'),
                windowMinutes: parseInt(Deno.env.get('REGISTRATION_WINDOW_MINUTES') || '60')
            },
            
            // Environment
            isProduction: Deno.env.get('DENO_ENV') === 'production',
            logLevel: (Deno.env.get('LOG_LEVEL') || 'info') as any
        };
        
        return this.instance;
    }
    
    private static parseEmailConfig(): Record<string, string> {
        const provider = Deno.env.get('EMAIL_PROVIDER') || 'smtp';
        
        switch (provider) {
            case 'smtp':
                return {
                    host: Deno.env.get('SMTP_HOST') || '',
                    port: Deno.env.get('SMTP_PORT') || '587',
                    user: Deno.env.get('SMTP_USER') || '',
                    password: Deno.env.get('SMTP_PASSWORD') || ''
                };
            case 'sendgrid':
                return {
                    apiKey: Deno.env.get('SENDGRID_API_KEY') || ''
                };
            case 'resend':
                return {
                    apiKey: Deno.env.get('RESEND_API_KEY') || ''
                };
            default:
                return {};
        }
    }
}
```

### Pattern 16: Fresh 2 Specific Optimizations
```typescript
// Fresh 2 route patterns and optimizations
// routes/api/auth/_middleware.ts - Fresh 2 API middleware
export async function handler(req: Request, ctx: FreshContext) {
    // Skip auth middleware for public endpoints
    const publicEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/oauth/*'];
    const url = new URL(req.url);
    
    if (publicEndpoints.some(pattern => 
        pattern.includes('*') 
            ? url.pathname.startsWith(pattern.replace('*', ''))
            : url.pathname === pattern
    )) {
        return await ctx.next();
    }
    
    // Validate session for protected endpoints
    const sessionToken = CookieManager.getCookie(req, 'session');
    if (!sessionToken) {
        return new Response(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    const session = await sessionManager.validate(sessionToken);
    if (!session) {
        return new Response(
            JSON.stringify({ error: 'Invalid session' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    // Add session to context
    ctx.state.session = session;
    ctx.state.user = session.userId ? await userService.findById(session.userId) : null;
    
    return await ctx.next();
}

// islands/LoginForm.tsx - Fresh 2 interactive login form
import { useSignal } from "@preact/signals";

export default function LoginForm() {
    const email = useSignal("");
    const password = useSignal("");
    const isLoading = useSignal(false);
    const error = useSignal("");
    
    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        isLoading.value = true;
        error.value = "";
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.value,
                    password: password.value
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                if (result.requiresTwoFactor) {
                    // Redirect to 2FA page
                    window.location.href = `/auth/2fa?token=${result.pendingToken}`;
                } else {
                    // Success - redirect to dashboard
                    window.location.href = '/dashboard';
                }
            } else {
                error.value = result.error || 'Login failed';
            }
        } catch (err) {
            error.value = 'Network error occurred';
        } finally {
            isLoading.value = false;
        }
    };
    
    return (
        <form onSubmit={handleSubmit} class="space-y-4">
            <div>
                <label htmlFor="email" class="block text-sm font-medium">Email</label>
                <input
                    id="email"
                    type="email"
                    value={email.value}
                    onInput={(e) => email.value = (e.target as HTMLInputElement).value}
                    required
                    class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
            </div>
            
            <div>
                <label htmlFor="password" class="block text-sm font-medium">Password</label>
                <input
                    id="password"
                    type="password"
                    value={password.value}
                    onInput={(e) => password.value = (e.target as HTMLInputElement).value}
                    required
                    class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
            </div>
            
            {error.value && (
                <div class="text-red-600 text-sm">{error.value}</div>
            )}
            
            <button
                type="submit"
                disabled={isLoading.value}
                class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
                {isLoading.value ? 'Signing in...' : 'Sign In'}
            </button>
        </form>
    );
}
```

## Summary: Core Competencies

When implementing authentication systems, always prioritize:

1. **Security over convenience** - Make secure choices the default
2. **Transparency over abstraction** - Developers must understand the security model  
3. **Testability over complexity** - Every security feature must be testable
4. **Monitoring over trust** - Log everything security-related
5. **Standards over innovation** - Use proven cryptographic primitives
6. **Framework adaptability** - Core logic should be framework-agnostic with adaptation layers
7. **Performance optimization** - Database queries and session validation should be efficient
8. **Error handling** - Fail secure and provide meaningful error messages without exposing internals

## Key Lucia-Inspired Principles

### Authentication Philosophy
- **Education over black-box libraries**: Teach the implementation, don't hide it
- **Security by design**: Every decision prioritizes security first
- **Framework flexibility**: Core authentication logic remains framework-independent
- **Developer control**: Complete transparency and customizability of auth flows

### Implementation Standards
- **Constant-time operations**: Prevent timing attacks in all security-critical paths
- **Cryptographically secure randomness**: Use Web Crypto API for all random generation
- **Proper secret management**: Hash secrets, never store them in plain text
- **CSRF protection**: Origin validation and token-based protection
- **Rate limiting**: Token bucket algorithm for smooth request handling
- **Session management**: ID+Secret dual-token system with proper expiration

### Database Design Patterns
- **Minimal required fields**: Only store what's absolutely necessary
- **Flexible user model**: Support multiple authentication methods
- **Proper indexing**: Optimize for common query patterns
- **Transaction safety**: Use database transactions for atomic operations

This architecture enables building authentication systems that are both secure and maintainable, following the proven patterns established by Lucia Auth while adapting to modern Deno + Fresh 2 development.
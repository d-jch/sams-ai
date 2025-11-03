---
mode: agent
---

# Lucia-Style Authentication System for Deno + Fresh 2

You are an expert authentication system architect, specializing in building
secure, production-ready authentication systems inspired by **Lucia Auth**
principles, implemented natively using **Deno + Fresh 2 + PostgreSQL**.

## 🎯 Project Goal

Build a **type-safe, session-based authentication system** that follows Lucia's
philosophy of simplicity, security, and developer experience. The system should
be:

- **Production-ready** with proper security measures
- **Developer-friendly** with excellent TypeScript support
- **Extensible** for future authentication strategies
- **Performant** with optimized database queries and caching

### Project Initialization

```bash
deno run -A -r jsr:@fresh/init sams-ai
cd sams-ai
deno i -D npm:daisyui@latest
deno i jsr:@db/postgres jsr:@felix/argon2 jsr:@panva/jose
```

## 🛠️ Technology Stack

### Core Framework

- **Runtime**: Deno 2.0+ (latest)
- **Web Framework**: Fresh 2.1+ (file-based routing, islands architecture)
- **Frontend**: Preact 10+ with TypeScript
- **Styling**: TailwindCSS v4 + daisyUI v5 (component library)

### Authentication Infrastructure

- **Database**: PostgreSQL 15+ with connection pooling
- **Database Client**: `jsr:@db/postgres` (official Deno PostgreSQL driver)
- **Password Hashing**: `jsr:@felix/argon2` for secure password hashing
- **Session Management**: Database-backed sessions with JWT tokens
- **Token Handling**: `jsr:@panva/jose` for JWT operations
- **Environment**: Deno's built-in `Deno.env` API

### Development Tools

- **Type Safety**: Full TypeScript with strict mode
- **Testing**: Deno's built-in test runner
- **Validation**: Custom validation utilities
- **Middleware**: Fresh 2's native middleware system

## 🏗️ Lucia-Style Architecture Principles

### Core Philosophy

Follow **Lucia Auth's design principles** for building authentication systems:

#### 1. **Security First**

- Secure password hashing with argon2
- CSRF protection with SameSite cookies
- Session-based authentication with secure token generation
- SQL injection prevention through parameterized queries
- XSS protection with proper input sanitization
- Rate limiting for authentication endpoints

#### 2. **Developer Experience**

- **Type Safety**: Full TypeScript definitions for all auth objects
- **Simple API**: Minimal, intuitive function signatures
- **Clear Errors**: Descriptive error messages and proper HTTP status codes
- **IDE Support**: IntelliSense and autocompletion for all auth methods

#### 3. **Modularity & Flexibility**

- **Composable**: Independent modules that work together
- **Extensible**: Easy to add OAuth providers, 2FA, email verification
- **Configurable**: Environment-based configuration for different deployment
  scenarios
- **Testable**: Pure functions with clear dependencies for easy unit testing

#### 4. **Performance & Scalability**

- **Database Optimization**: Proper indexes, connection pooling, query
  optimization
- **Session Cleanup**: Automatic expired session removal
- **Minimal Dependencies**: Leverage Deno's built-in capabilities where possible
- **Caching Strategy**: Efficient session validation and user lookup

## 📁 Expected Directory Structure

```
sams-ai/
├── lib/                          # Core authentication library
│   ├── auth.ts                   # Main auth class (Lucia-inspired)
│   ├── session.ts                # Session management
│   ├── crypto.ts                 # Password hashing & verification
│   ├── db.ts                     # Database connection & queries
│   ├── types.ts                  # TypeScript definitions
│   └── validation.ts             # Input validation helpers
├── routes/
│   ├── _middleware.ts            # Global auth middleware
│   ├── login.tsx                 # Login page
│   ├── signup.tsx                # Registration page
│   ├── dashboard.tsx             # Protected dashboard
│   ├── api/
│   │   └── auth/
│   │       ├── login.ts          # POST /api/auth/login
│   │       ├── signup.ts         # POST /api/auth/signup
│   │       ├── logout.ts         # POST /api/auth/logout
│   │       └── me.ts             # GET /api/auth/me
├── components/
│   ├── AuthForm.tsx              # Reusable login/signup form
│   ├── LogoutButton.tsx          # Logout functionality
│   └── ProtectedRoute.tsx        # HOC for protected pages
├── islands/
│   ├── LoginForm.tsx             # Interactive login form
│   └── SignupForm.tsx            # Interactive signup form
├── sql/
│   ├── schema.sql                # Database schema
│   └── migrations/               # Database migrations
├── utils.ts                      # Fresh utilities (updated with auth state)
└── .env                          # Environment variables
```

## 🔐 Core Authentication Features

### 1. **User Management**

- **Registration**: Email/password signup with validation
- **Authentication**: Secure login with argon2 password verification
- **Session Handling**: Database-backed sessions with configurable expiration
- **User Context**: Seamless user state management in Fresh routes and islands

### 2. **Security Features**

- **Password Security**: argon2 hashing with memory cost 64MB+, time cost 3+
- **Session Security**: Cryptographically secure session tokens (32+ bytes)
- **CSRF Protection**: SameSite cookie attributes and token validation
- **Rate Limiting**: Configurable limits for auth endpoints
- **Input Validation**: Comprehensive email/password validation

### 3. **Session Management (Lucia-Style)**

```typescript
// Core session interface
interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  fresh: boolean;
}

// Main auth methods
class Auth {
  createSession(userId: string): Promise<Session>;
  validateSession(sessionId: string): Promise<SessionValidationResult>;
  invalidateSession(sessionId: string): Promise<void>;
  invalidateUserSessions(userId: string): Promise<void>;
}
```

### 4. **Fresh 2 Integration**

- **Middleware**: Global session validation middleware
- **Route Protection**: HOCs and utilities for protected routes
- **State Management**: User context in Fresh's state system
- **Islands**: Interactive auth forms with real-time validation

### 5. **Database Design**

```sql
-- Optimized for performance and security
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  id VARCHAR(40) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 📋 Implementation Checklist

### Phase 1: Foundation

- [ ] **Database Setup**: PostgreSQL connection, schema creation, migrations
- [ ] **Core Types**: User, Session, and auth-related TypeScript interfaces
- [ ] **Crypto Utils**: Password hashing and session token generation
- [ ] **Database Layer**: User and session CRUD operations with proper indexing

### Phase 2: Authentication Core

- [ ] **Auth Class**: Main Lucia-inspired authentication manager
- [ ] **Session Management**: Create, validate, invalidate sessions
- [ ] **Middleware**: Fresh 2 middleware for global session handling
- [ ] **Validation**: Input validation for email, password, and auth data

### Phase 3: API Layer

- [ ] **Auth Routes**: `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`
- [ ] **Error Handling**: Consistent error responses and logging
- [ ] **Rate Limiting**: Protection against brute force attacks
- [ ] **Security Headers**: Proper cookie settings and CSRF protection

### Phase 4: User Interface

- [ ] **Auth Pages**: Login, signup, and dashboard pages with daisyUI
- [ ] **Interactive Forms**: Islands for real-time validation and UX
- [ ] **Protected Routes**: HOCs and utilities for route protection
- [ ] **User Context**: Seamless user state throughout the application

### Phase 5: Production Readiness

- [ ] **Testing**: Comprehensive test suite for all auth flows
- [ ] **Performance**: Database query optimization and caching
- [ ] **Security Audit**: Security headers, input sanitization, vulnerability
      testing
- [ ] **Documentation**: API documentation and usage examples

## 🛡️ Security Considerations

### Required Security Measures

1. **Password Security**
   - Minimum 8 characters, complexity requirements
   - argon2
   - No password hints or recovery questions

2. **Session Security**
   - Cryptographically secure random session IDs (32+ bytes)
   - HttpOnly, Secure, SameSite=Lax cookies
   - Configurable session expiration (default: 30 days)
   - Session regeneration on privilege changes

3. **Attack Prevention**
   - Rate limiting: 5 attempts per 15 minutes per IP
   - SQL injection prevention via parameterized queries
   - XSS protection through input sanitization
   - CSRF protection with SameSite cookies

4. **Data Protection**
   - No sensitive data in client-side storage
   - Proper error messages (no information disclosure)
   - Database connection encryption (SSL)
   - Environment variable protection

## 📊 Performance Targets

- **Session Validation**: < 10ms (with database connection pooling)
- **Password Hashing**: < 1000ms (argon2 with 64MB memory, 3 iterations)
- **Database Queries**: Proper indexing for sub-10ms user lookups
- **Memory Usage**: Minimal session storage footprint
- **Concurrent Users**: Support 1000+ concurrent sessions

## 🎯 Success Criteria

The authentication system is considered complete when:

1. Users can register, login, and logout securely
2. Sessions persist across browser sessions
3. Protected routes properly enforce authentication
4. All security measures are implemented and tested
5. Performance targets are met
6. Code is well-documented and maintainable

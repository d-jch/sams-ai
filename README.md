# 🤖 Sams AI - Fresh 2 Authentication System

[![CI/CD Pipeline](https://github.com/yourusername/sams-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/sams-ai/actions/workflows/ci.yml)
[![Deployment Status](https://github.com/d-jch/sams-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/d-jch/sams-ai/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/yourusername/sams-ai/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/sams-ai)
[![Deno Version](https://img.shields.io/badge/deno-v2.x-black.svg)](https://deno.land/)
[![Fresh Version](https://img.shields.io/badge/fresh-v2.1.4-brightgreen.svg)](https://fresh.deno.dev/)

A secure, production-ready authentication system built with **Fresh 2**,
**Deno**, **PostgreSQL**, and **Argon2**. This implementation follows Lucia
Auth's design philosophy of simplicity, security, and developer experience, with
comprehensive CI/CD pipeline and testing suite.

## 🚀 Features

- **🔐 Ultra Secure**: Argon2id password hashing with configurable parameters
- **⚡ Lightning Fast**: Built on Fresh 2 and Deno for optimal performance
- **🎨 Beautiful UI**: Modern interface with TailwindCSS v4 and daisyUI v5
- **🔒 Session Management**: Database-backed sessions with automatic cleanup
- **🛡️ Security First**: CSRF protection, rate limiting, input validation
- **📱 Responsive**: Mobile-first design with accessible components
- **🔧 Type Safe**: Full TypeScript coverage with strict mode

## 🛠️ Tech Stack

### Core Framework

- **Runtime**: Deno 2.0+
- **Web Framework**: Fresh 2.1+ (file-based routing, islands architecture)
- **Frontend**: Preact 10+ with TypeScript
- **Styling**: TailwindCSS v4 + daisyUI v5

### Authentication Infrastructure

- **Database**: PostgreSQL 15+ with connection pooling
- **Database Client**: `jsr:@db/postgres`
- **Password Hashing**: `jsr:@felix/argon2` (Argon2id implementation)
- **Session Management**: Lucia-style dual-token sessions with constant-time
  verification
- **Token Handling**: `jsr:@panva/jose` for JWT operations
- **Cryptography**: Web Crypto API for secure random generation and hashing

## 🏗️ Project Structure

```
sams-ai/
├── lib/                          # Core authentication library
│   ├── auth.ts                   # Main auth class (Lucia-inspired)
│   ├── session.ts                # Session management (unused - integrated into auth.ts)
│   ├── crypto.ts                 # Password hashing & verification
│   ├── db.ts                     # Database connection & queries
│   ├── types.ts                  # TypeScript definitions
│   └── validation.ts             # Input validation helpers
├── routes/
│   ├── _middleware.ts            # Global auth middleware
│   ├── index.tsx                 # Home page
│   ├── login.tsx                 # Login page
│   ├── signup.tsx                # Registration page
│   ├── dashboard.tsx             # Protected dashboard
│   └── api/auth/
│       ├── login.ts              # POST /api/auth/login
│       ├── signup.ts             # POST /api/auth/signup
│       ├── logout.ts             # POST /api/auth/logout
│       └── me.ts                 # GET /api/auth/me
├── islands/
│   ├── LoginForm.tsx             # Interactive login form
│   └── SignupForm.tsx            # Interactive signup form
├── components/                   # Reusable UI components
├── sql/
│   └── schema.sql                # Database schema
└── .env                          # Environment variables
```

## 🚦 Getting Started

### Prerequisites

- [Deno 2.0+](https://deno.land/manual/getting_started/installation)
- [PostgreSQL 15+](https://www.postgresql.org/download/)

### 1. Clone and Install

```bash
git clone <your-repo>
cd sams-ai
deno install
```

### 2. Environment Setup

Create a `.env` file:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/sams_ai_auth

# Session Configuration
SESSION_SECRET=your-super-secure-session-secret-at-least-32-characters-long

# Argon2 Configuration (optional - these are defaults)
ARGON2_MEMORY_COST=65536  # 64MB in KB
ARGON2_TIME_COST=3        # 3 iterations
ARGON2_PARALLELISM=1      # 1 thread

# Application Configuration
APP_ENV=development
```

### 3. Database Setup

Create the database and run the schema:

```bash
# Create database
createdb sams_ai_auth

# Run schema
psql -d sams_ai_auth -f sql/schema.sql
```

### 4. Start Development Server

```bash
deno task dev
```

Visit `http://localhost:8000` to see the application.

## 🔐 Authentication Flow

### Registration Process

1. User submits registration form
2. Input validation (email, password strength, name)
3. Password hashed with Argon2id
4. User created in database
5. Session created and cookie set
6. Redirect to dashboard

### Login Process

1. User submits login credentials
2. Email/password validation
3. Password verification against hash
4. Session created and cookie set
5. Redirect to dashboard or intended page

### Session Management

- Sessions stored in PostgreSQL with expiration
- Automatic session extension for active users
- Secure session cookies (HttpOnly, Secure, SameSite)
- Cleanup of expired sessions

## 🛡️ Security Features

### Lucia-Style Dual-Token Session Security

- **Dual-Token Architecture**: Sessions use ID + Secret pattern
  (`<SESSION_ID>.<SESSION_SECRET>`)
- **Constant-Time Verification**: Prevents timing attacks through consistent
  execution time
- **SHA-256 Secret Hashing**: Session secrets are hashed for secure storage and
  verification
- **Cryptographically Secure Random**: Uses Web Crypto API for all random
  generation

### Password Security

- **Argon2id** hashing with configurable parameters (default: 64MB memory, 3
  iterations)
- Default: 64MB memory cost, 3 iterations, 1 thread
- Minimum password requirements with strength validation
- No password hints or recovery questions

### Session Security

- Cryptographically secure random session IDs (32+ bytes)
- HttpOnly, Secure, SameSite=Lax cookies
- Configurable session expiration (default: 30 days)
- Session regeneration on privilege changes

### Attack Prevention

- Rate limiting: 5 attempts per 15 minutes per IP (configurable)
- SQL injection prevention via parameterized queries
- XSS protection through input sanitization
- CSRF protection with SameSite cookies

## 📊 API Endpoints

### Authentication Endpoints

| Method | Endpoint           | Description       |
| ------ | ------------------ | ----------------- |
| POST   | `/api/auth/signup` | Register new user |
| POST   | `/api/auth/login`  | Login user        |
| POST   | `/api/auth/logout` | Logout user       |
| GET    | `/api/auth/me`     | Get current user  |

### Example API Usage

```javascript
// Register
const response = await fetch("/api/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "SecurePassword123!",
    name: "John Doe",
  }),
});

// Login
const response = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "SecurePassword123!",
  }),
});
```

## 🧪 Development

### Running Tests

```bash
deno test --allow-all
```

### Code Quality

```bash
# Format code
deno fmt

# Lint code
deno lint

# Type check
deno check **/*.ts **/*.tsx
```

### Database Migrations

```bash
# Add new migration
psql -d sams_ai_auth -f sql/migrations/001_new_feature.sql
```

## 🚀 Production Deployment

This project is configured for automatic deployment to **Deno Deploy** (new
version) using GitHub integration.

### Quick Deploy Setup

1. **Create Deno Deploy App**
   - Visit [console.deno.com](https://console.deno.com)
   - Create organization and new app named `sams-ai`
   - Connect to this GitHub repository
   - Framework: **Fresh**, Build: `deno task build`, Entry: `main.ts`

2. **Configure Environment Variables**
   ```env
   # Database (required)
   DATABASE_URL=postgresql://user:pass@host:port/db
   DB_SSL=true

   # Security (required)
   JWT_SECRET=your-production-secret-min-32-chars

   # Performance (optional)
   ARGON2_MEMORY_COST=131072
   ARGON2_TIME_COST=4
   ARGON2_PARALLELISM=4

   # Environment
   DENO_ENV=production
   ```

3. **Deploy Automatically**
   - Push to `main` branch → Production deployment
   - Create Pull Request → Preview deployment
   - Branch push → Development deployment

### Database Setup (Production)

Recommended cloud PostgreSQL services:

- **Supabase**: [supabase.com](https://supabase.com) (Free tier available)
- **Neon**: [neon.tech](https://neon.tech) (Serverless PostgreSQL)
- **Railway**: [railway.app](https://railway.app) (Simple deployment)

After creating database, run migrations:

```bash
deno run -A scripts/migrate.ts
```

### Security Checklist

- [x] HTTPS enforced by Deno Deploy
- [x] Session secrets (32+ characters)
- [x] Argon2id password hashing
- [x] CSRF protection enabled
- [x] Input validation and sanitization
- [ ] Rate limiting (configure as needed)
- [ ] Custom domain setup (optional)
- [ ] Enable database SSL
- [ ] Set secure cookie flags
- [ ] Regular security audits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by [Lucia Auth](https://lucia-auth.com/) for design patterns
- Built with [Fresh 2](https://fresh.deno.dev/) framework
- Styled with [daisyUI](https://daisyui.com/) components
- Secured with [Argon2](https://github.com/P-H-C/phc-winner-argon2) hashing

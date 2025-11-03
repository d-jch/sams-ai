// Core authentication types following Lucia-style patterns

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  lastVerifiedAt: Date; // When the session token was last verified
  fresh: boolean;
  secretHash: Uint8Array; // Hashed secret for secure verification (prevents timing attacks)
}

export interface SessionValidationResult {
  session: Session | null;
  user: User | null;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Database row types (with snake_case as stored in PostgreSQL)
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SessionRow {
  id: string;
  user_id: string;
  last_verified_at: Date;
  created_at: Date;
  secret_hash: Uint8Array; // Stored hashed secret for verification
}

// Auth configuration
export interface AuthConfig {
  sessionIdLength: number; // in bytes (default: 32)
  inactivityTimeoutMs: number; // in milliseconds (default: 10 days)
  activityCheckIntervalMs: number; // in milliseconds (default: 1 hour)
  argon2MemoryCost: number; // in KB (default: 64MB = 65536 KB)
  argon2TimeCost: number; // iterations (default: 3)
  argon2Parallelism: number; // threads (default: 1)
}

// Fresh context state extension for authentication
export interface AuthState {
  user: User | null;
  session: Session | null;
}

// API response types
export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  errors?: Record<string, string>;
}

export interface ValidationError {
  field: string;
  message: string;
}

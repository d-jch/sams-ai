// Core authentication types following Lucia-style patterns

// =============================================================================
// ENUMS
// =============================================================================

export type UserRole = "researcher" | "technician" | "lab_manager" | "admin";
export type SequencingType =
  | "WGS"
  | "WES"
  | "RNA-seq"
  | "amplicon"
  | "ChIP-seq";
export type RequestStatus =
  | "pending"
  | "approved"
  | "in_progress"
  | "completed"
  | "cancelled";
export type PriorityLevel = "low" | "normal" | "high" | "urgent";
export type SampleType = "DNA" | "RNA" | "Protein" | "Cell";
export type QCStatus = "pending" | "passed" | "failed" | "retest";

// =============================================================================
// USER & AUTH TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
  role?: UserRole;
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
  role: UserRole;
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

// =============================================================================
// BUSINESS TYPES - Sequencing Requests
// =============================================================================

export interface SequencingRequest {
  id: string;
  userId: string;
  projectName: string;
  sequencingType: SequencingType;
  status: RequestStatus;
  priority: PriorityLevel;
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SequencingRequestRow {
  id: string;
  user_id: string;
  project_name: string;
  sequencing_type: SequencingType;
  status: RequestStatus;
  priority: PriorityLevel;
  estimated_cost?: number;
  actual_cost?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSequencingRequestData {
  userId: string;
  projectName: string;
  sequencingType: SequencingType;
  priority?: PriorityLevel;
  estimatedCost?: number;
  notes?: string;
}

// =============================================================================
// BUSINESS TYPES - Samples
// =============================================================================

export interface Sample {
  id: string;
  requestId: string;
  name: string;
  type: SampleType;
  barcode?: string;
  concentration?: number;
  volume?: number;
  qcStatus: QCStatus;
  storageLocation?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SampleRow {
  id: string;
  request_id: string;
  name: string;
  type: SampleType;
  barcode?: string;
  concentration?: number;
  volume?: number;
  qc_status: QCStatus;
  storage_location?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSampleData {
  requestId: string;
  name: string;
  type: SampleType;
  concentration?: number;
  volume?: number;
  storageLocation?: string;
  notes?: string;
}

// =============================================================================
// BUSINESS TYPES - Status History
// =============================================================================

export interface RequestStatusHistory {
  id: string;
  requestId: string;
  oldStatus?: RequestStatus;
  newStatus: RequestStatus;
  changedBy: string;
  comment?: string;
  createdAt: Date;
}

export interface RequestStatusHistoryRow {
  id: string;
  request_id: string;
  old_status?: RequestStatus;
  new_status: RequestStatus;
  changed_by: string;
  comment?: string;
  created_at: Date;
}

// =============================================================================
// PAGINATION & FILTERING TYPES
// =============================================================================

export interface PaginationParams {
  page: number; // 页码，从 1 开始
  limit: number; // 每页数量
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number; // 总记录数
  totalPages: number; // 总页数
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface RequestFilterParams {
  status?: RequestStatus;
  sequencingType?: SequencingType;
  priority?: PriorityLevel;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SampleFilterParams {
  type?: SampleType;
  qcStatus?: QCStatus;
  requestId?: string;
}

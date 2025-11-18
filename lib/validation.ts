export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ValidationRule {
  field: string;
  value: unknown;
  rules: string[];
}

/**
 * Simple but effective validation utility
 */
export class Validator {
  private errors: Record<string, string> = {};

  /**
   * Validate email format
   */
  email(value: string, fieldName: string = "email"): this {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value) {
      this.errors[fieldName] = `${fieldName} is required`;
    } else if (!emailRegex.test(value)) {
      this.errors[fieldName] = `${fieldName} must be a valid email address`;
    }

    return this;
  }

  /**
   * Validate password strength
   */
  password(value: string, fieldName: string = "password"): this {
    if (!value) {
      this.errors[fieldName] = `${fieldName} is required`;
      return this;
    }

    const errors = [];

    if (value.length < 8) {
      errors.push("at least 8 characters");
    }

    if (!/[A-Z]/.test(value)) {
      errors.push("one uppercase letter");
    }

    if (!/[a-z]/.test(value)) {
      errors.push("one lowercase letter");
    }

    if (!/\d/.test(value)) {
      errors.push("one number");
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(value)) {
      errors.push("one special character");
    }

    if (errors.length > 0) {
      this.errors[fieldName] = `Password must contain ${errors.join(", ")}`;
    }

    return this;
  }

  /**
   * Validate required field
   */
  required(value: string, fieldName: string): this {
    if (!value || value.trim().length === 0) {
      this.errors[fieldName] = `${fieldName} is required`;
    }

    return this;
  }

  /**
   * Validate string length
   */
  length(value: string, min: number, max: number, fieldName: string): this {
    if (value && (value.length < min || value.length > max)) {
      this.errors[fieldName] =
        `${fieldName} must be between ${min} and ${max} characters`;
    }

    return this;
  }

  /**
   * Validate name (支持中文或英文，不允许混合)
   */
  name(value: string, fieldName: string = "name"): this {
    if (!value) {
      this.errors[fieldName] = `${fieldName} is required`;
      return this;
    }

    // Check if it's pure Chinese name (including spaces, hyphens)
    const chineseNameRegex = /^[\u4e00-\u9fa5\s\-]+$/;
    // Check if it's pure English name (including spaces, hyphens, apostrophes)
    const englishNameRegex = /^[a-zA-Z\s\-']+$/;

    const isPureChinese = chineseNameRegex.test(value);
    const isPureEnglish = englishNameRegex.test(value);

    if (!isPureChinese && !isPureEnglish) {
      this.errors[fieldName] =
        `${fieldName} must be either pure Chinese or pure English (no mixing)`;
    } else if (value.trim().length < 2) {
      this.errors[fieldName] =
        `${fieldName} must be at least 2 characters long`;
    } else if (value.trim().length > 50) {
      this.errors[fieldName] =
        `${fieldName} cannot be longer than 50 characters`;
    }

    return this;
  }

  /**
   * Custom validation rule
   */
  custom(
    value: unknown,
    fieldName: string,
    validator: (value: unknown) => boolean,
    errorMessage: string,
  ): this {
    if (!validator(value)) {
      this.errors[fieldName] = errorMessage;
    }

    return this;
  }

  /**
   * Get validation result
   */
  getResult(): ValidationResult {
    return {
      isValid: Object.keys(this.errors).length === 0,
      errors: { ...this.errors },
    };
  }

  /**
   * Reset validator for reuse
   */
  reset(): this {
    this.errors = {};
    return this;
  }
}

/**
 * Validate user registration data
 */
export function validateRegistration(
  data: { email: string; password: string; name: string },
): ValidationResult {
  const validator = new Validator();

  validator
    .email(data.email, "email")
    .password(data.password, "password")
    .name(data.name, "name");

  return validator.getResult();
}

/**
 * Validate user login data
 */
export function validateLogin(
  data: { email: string; password: string },
): ValidationResult {
  const validator = new Validator();

  validator
    .required(data.email, "email")
    .email(data.email, "email")
    .required(data.password, "password");

  return validator.getResult();
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

/**
 * Create a new validator instance
 */
export function createValidator(): Validator {
  return new Validator();
}

// =============================================================================
// PRIMER SEQUENCE VALIDATION
// =============================================================================

/**
 * Validate primer sequence (only contains A, T, G, C)
 */
export function validatePrimerSequence(sequence: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!sequence) {
    errors.sequence = "Primer sequence is required";
    return { isValid: false, errors };
  }

  // Check if sequence only contains valid nucleotides (A, T, G, C)
  const validSequenceRegex = /^[ATGCatgc]+$/;
  if (!validSequenceRegex.test(sequence)) {
    errors.sequence = "Primer sequence must only contain A, T, G, C characters";
    return { isValid: false, errors };
  }

  return { isValid: true, errors };
}

/**
 * Validate primer length (18-30 bp)
 */
export function validatePrimerLength(sequence: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!sequence) {
    errors.sequence = "Primer sequence is required";
    return { isValid: false, errors };
  }

  const length = sequence.length;
  if (length < 18 || length > 30) {
    errors.sequence =
      `Primer length must be between 18-30 bp (current: ${length} bp)`;
    return { isValid: false, errors };
  }

  return { isValid: true, errors };
}

/**
 * Calculate GC content percentage
 */
export function calculateGCContent(sequence: string): number {
  const upperSeq = sequence.toUpperCase();
  const gcCount = (upperSeq.match(/[GC]/g) || []).length;
  return (gcCount / sequence.length) * 100;
}

/**
 * Validate GC content (40-60%)
 */
export function validateGCContent(sequence: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!sequence) {
    errors.sequence = "Primer sequence is required";
    return { isValid: false, errors };
  }

  const gcContent = calculateGCContent(sequence);

  if (gcContent < 40 || gcContent > 60) {
    errors.gcContent = `GC content must be between 40-60% (current: ${
      gcContent.toFixed(1)
    }%)`;
    return { isValid: false, errors };
  }

  return { isValid: true, errors };
}

/**
 * Calculate melting temperature (Tm) using basic formula
 * For primers < 14 nt: Tm = (A+T)*2 + (G+C)*4
 * For primers >= 14 nt: Tm = 64.9 + 41*(G+C-16.4)/(A+T+G+C)
 */
export function calculateTm(sequence: string): number {
  const upperSeq = sequence.toUpperCase();
  const length = sequence.length;

  const aCount = (upperSeq.match(/A/g) || []).length;
  const tCount = (upperSeq.match(/T/g) || []).length;
  const gCount = (upperSeq.match(/G/g) || []).length;
  const cCount = (upperSeq.match(/C/g) || []).length;

  if (length < 14) {
    // Simple formula for short primers
    return (aCount + tCount) * 2 + (gCount + cCount) * 4;
  } else {
    // Salt-adjusted formula for longer primers
    return 64.9 + (41 * (gCount + cCount - 16.4)) / length;
  }
}

/**
 * Validate melting temperature Tm (55-65°C)
 */
export function validateTm(sequence: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!sequence) {
    errors.sequence = "Primer sequence is required";
    return { isValid: false, errors };
  }

  const tm = calculateTm(sequence);

  if (tm < 55 || tm > 65) {
    errors.tm = `Melting temperature (Tm) should be between 55-65°C (current: ${
      tm.toFixed(1)
    }°C)`;
    return { isValid: false, errors };
  }

  return { isValid: true, errors };
}

/**
 * Comprehensive primer validation
 * Combines all primer validation rules
 */
export function validatePrimer(
  sequence: string,
): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate sequence characters
  const seqResult = validatePrimerSequence(sequence);
  if (!seqResult.isValid) {
    Object.assign(errors, seqResult.errors);
  }

  // Validate length
  const lengthResult = validatePrimerLength(sequence);
  if (!lengthResult.isValid) {
    Object.assign(errors, lengthResult.errors);
  }

  // Validate GC content
  const gcResult = validateGCContent(sequence);
  if (!gcResult.isValid) {
    Object.assign(errors, gcResult.errors);
  }

  // Validate Tm
  const tmResult = validateTm(sequence);
  if (!tmResult.isValid) {
    Object.assign(errors, tmResult.errors);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

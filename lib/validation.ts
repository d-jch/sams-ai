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

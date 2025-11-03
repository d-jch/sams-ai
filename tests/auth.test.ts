import { expect } from "@std/expect";
import { getPasswordManager, getSessionTokenManager } from "../lib/crypto.ts";
import { Validator } from "../lib/validation.ts";

Deno.test("Password Manager - hashes and verifies passwords", async () => {
  const passwordManager = getPasswordManager();
  const password = "TestPassword123!";

  const hash = await passwordManager.hashPassword(password);
  expect(hash).toBeDefined();
  expect(hash.length).toBeGreaterThan(0);

  const isValid = await passwordManager.verifyPassword(password, hash);
  expect(isValid).toBe(true);

  const isInvalid = await passwordManager.verifyPassword(
    "wrong-password",
    hash,
  );
  expect(isInvalid).toBe(false);
});

Deno.test("Session Token Manager - generates unique session tokens", async () => {
  const tokenManager = getSessionTokenManager();

  const sessionData1 = await tokenManager.generateSessionToken();
  const sessionData2 = await tokenManager.generateSessionToken();

  expect(sessionData1.token).not.toBe(sessionData2.token);
  expect(sessionData1.id).not.toBe(sessionData2.id);
  expect(sessionData1.secret).not.toBe(sessionData2.secret);

  expect(sessionData1.token.length).toBeGreaterThan(50); // id.secret format
  expect(sessionData2.token.length).toBeGreaterThan(50);
});

Deno.test("Session Token Manager - generates secure random strings", () => {
  const tokenManager = getSessionTokenManager();

  const random1 = tokenManager.generateSecureRandomString(16);
  const random2 = tokenManager.generateSecureRandomString(16);

  expect(random1).not.toBe(random2);
  expect(random1.length).toBe(16);
  expect(random2.length).toBe(16);
});

Deno.test("Session Token Manager - hashes secrets consistently", async () => {
  const tokenManager = getSessionTokenManager();
  const secret = "test-secret-123";

  const hash1 = await tokenManager.hashSecret(secret);
  const hash2 = await tokenManager.hashSecret(secret);

  expect(hash1).toEqual(hash2);
  expect(hash1).toBeInstanceOf(Uint8Array);
  expect(hash1.length).toBe(32); // SHA-256 produces 32 bytes
});

Deno.test("Session Token Manager - parses session tokens", () => {
  const tokenManager = getSessionTokenManager();

  const validToken = "sessionid123.sessionsecret456";
  const parsed = tokenManager.parseSessionToken(validToken);

  expect(parsed).not.toBeNull();
  expect(parsed!.sessionId).toBe("sessionid123");
  expect(parsed!.sessionSecret).toBe("sessionsecret456");

  // Test invalid tokens
  expect(tokenManager.parseSessionToken("invalid")).toBeNull();
  expect(tokenManager.parseSessionToken("")).toBeNull();
  expect(tokenManager.parseSessionToken("no.dots.here.invalid")).toBeNull();
});

Deno.test("Session Token Manager - verifies session secrets", async () => {
  const tokenManager = getSessionTokenManager();

  const secret = "test-secret-123";
  const hash = await tokenManager.hashSecret(secret);

  const isValid = await tokenManager.verifySessionSecret(secret, hash);
  expect(isValid).toBe(true);

  const isInvalid = await tokenManager.verifySessionSecret(
    "wrong-secret",
    hash,
  );
  expect(isInvalid).toBe(false);
});

Deno.test("Validator - accepts valid emails", () => {
  const result1 = new Validator().email("user@example.com").getResult();
  expect(result1.isValid).toBe(true);
  expect(result1.errors).toEqual({});

  const result2 = new Validator().email("test.email+tag@domain.co.uk")
    .getResult();
  expect(result2.isValid).toBe(true);
  expect(result2.errors).toEqual({});

  const result3 = new Validator().email("user123@test-domain.com").getResult();
  expect(result3.isValid).toBe(true);
  expect(result3.errors).toEqual({});
});

Deno.test("Validator - rejects invalid emails", () => {
  const result1 = new Validator().email("").getResult();
  expect(result1.isValid).toBe(false);
  expect(Object.keys(result1.errors).length).toBeGreaterThan(0);

  const result2 = new Validator().email("invalid-email").getResult();
  expect(result2.isValid).toBe(false);
  expect(Object.keys(result2.errors).length).toBeGreaterThan(0);

  const result3 = new Validator().email("@domain.com").getResult();
  expect(result3.isValid).toBe(false);
  expect(Object.keys(result3.errors).length).toBeGreaterThan(0);
});

Deno.test("Validator - accepts strong passwords", () => {
  const result1 = new Validator().password("SecurePass123!").getResult();
  expect(result1.isValid).toBe(true);
  expect(result1.errors).toEqual({});

  const result2 = new Validator().password("MyStr0ng#Pass").getResult();
  expect(result2.isValid).toBe(true);
  expect(result2.errors).toEqual({});
});

Deno.test("Validator - rejects weak passwords", () => {
  // Too short
  const result1 = new Validator().password("Weak1!").getResult();
  expect(result1.isValid).toBe(false);
  expect(Object.keys(result1.errors).length).toBeGreaterThan(0);

  // No uppercase
  const result2 = new Validator().password("weakpass123!").getResult();
  expect(result2.isValid).toBe(false);
  expect(Object.keys(result2.errors).length).toBeGreaterThan(0);

  // No lowercase
  const result3 = new Validator().password("WEAKPASS123!").getResult();
  expect(result3.isValid).toBe(false);
  expect(Object.keys(result3.errors).length).toBeGreaterThan(0);

  // No number
  const result4 = new Validator().password("WeakPass!").getResult();
  expect(result4.isValid).toBe(false);
  expect(Object.keys(result4.errors).length).toBeGreaterThan(0);

  // No special character
  const result5 = new Validator().password("WeakPass123").getResult();
  expect(result5.isValid).toBe(false);
  expect(Object.keys(result5.errors).length).toBeGreaterThan(0);
});

Deno.test("Validator - handles multiple validation errors", () => {
  const result = new Validator()
    .email("invalid-email")
    .password("weak")
    .required("", "name")
    .getResult();

  expect(result.isValid).toBe(false);
  expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(3);
});

Deno.test("Validator - constant time comparison", () => {
  const tokenManager = getSessionTokenManager();

  const arr1 = new Uint8Array([1, 2, 3, 4]);
  const arr2 = new Uint8Array([1, 2, 3, 4]);
  const arr3 = new Uint8Array([1, 2, 3, 5]);
  const arr4 = new Uint8Array([1, 2, 3]); // Different length

  expect(tokenManager.constantTimeEqual(arr1, arr2)).toBe(true);
  expect(tokenManager.constantTimeEqual(arr1, arr3)).toBe(false);
  expect(tokenManager.constantTimeEqual(arr1, arr4)).toBe(false);
});

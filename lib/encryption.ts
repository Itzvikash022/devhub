import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY environment variable is not defined.");
}

// AES-256-GCM requires a 32-byte key (64 hex chars)
if (ENCRYPTION_KEY.length !== 64) {
  throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).");
}

const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, "hex");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

export interface EncryptedData {
  ciphertext: string; // hex-encoded
  iv: string; // hex-encoded
  tag: string; // hex-encoded auth tag
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Each call generates a fresh random IV — never reuse IVs.
 */
export function encrypt(plaintext: string): EncryptedData {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

/**
 * Decrypts ciphertext produced by encrypt().
 * Throws if the auth tag verification fails (data tampered).
 */
export function decrypt(ciphertext: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, Buffer.from(iv, "hex"), {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(Buffer.from(tag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const KEY_LENGTH = 32; // 256 bits
const ITERATIONS = 100000;
const DIGEST = "sha256";

/**
 * Derives a cryptographic key from a passphrase and salt using PBKDF2.
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LENGTH, DIGEST);
}

/**
 * Encrypts a plaintext string using a passphrase.
 * Returns the hex payload in the format "salt:iv:ciphertext".
 */
export function encrypt(text: string, passphrase: string): string {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);
  const key = deriveKey(passphrase, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${salt.toString("hex")}:${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a hex payload in "salt:iv:ciphertext" format using a passphrase.
 * Returns the plaintext string. Throws an error if decryption fails.
 */
export function decrypt(encryptedText: string, passphrase: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("INVALID_ENCRYPTED_FORMAT");
  }

  const salt = Buffer.from(parts[0], "hex");
  const iv = Buffer.from(parts[1], "hex");
  const ciphertext = parts[2];

  const key = deriveKey(passphrase, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// ─── AES-256-GCM Server-side Encryption ──────────────────────────────────────

const GCM_ALGORITHM = "aes-256-gcm";

function getGcmEncryptionKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error("INVALID_ENCRYPTION_KEY_ENV");
  }
  return Buffer.from(hexKey, "hex");
}

/**
 * Encrypts a string using AES-256-GCM and the server ENCRYPTION_KEY env variable.
 * Returns the ciphertext + tag in encryptedSecret and the hex IV.
 */
export function encryptSecret(plainText: string): { encryptedSecret: string; iv: string } {
  const key = getGcmEncryptionKey();
  const iv = crypto.randomBytes(12); // GCM standard IV is 12 bytes
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag().toString("hex");
  const encryptedSecret = `${encrypted}:${tag}`;

  return {
    encryptedSecret,
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypts a string using AES-256-GCM and the server ENCRYPTION_KEY env variable.
 * Expects the encryptedSecret (containing tag) and iv in hex format.
 */
export function decryptSecret(encryptedSecret: string, ivHex: string): string {
  const key = getGcmEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");

  const parts = encryptedSecret.split(":");
  if (parts.length !== 2) {
    throw new Error("INVALID_ENCRYPTED_FORMAT");
  }

  const ciphertext = parts[0];
  const tag = Buffer.from(parts[1], "hex");

  const decipher = crypto.createDecipheriv(GCM_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

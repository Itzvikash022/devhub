import jwt from "jsonwebtoken";
import type { JWTPayload } from "@/types/auth.types";
import { JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } from "@/constants/app.constants";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined.");
}

/**
 * Signs a short-lived access token (15 minutes).
 */
export function signAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, ACCESS_SECRET!, { expiresIn: JWT_ACCESS_EXPIRES_IN });
}

/**
 * Signs a long-lived refresh token (30 days).
 */
export function signRefreshToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, REFRESH_SECRET!, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Verifies an access token. Throws if invalid or expired.
 */
export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, ACCESS_SECRET!) as JWTPayload;
}

/**
 * Verifies a refresh token. Throws if invalid or expired.
 */
export function verifyRefreshToken(token: string): JWTPayload {
  return jwt.verify(token, REFRESH_SECRET!) as JWTPayload;
}

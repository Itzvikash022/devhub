import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken, verifyRefreshToken, signAccessToken } from "./jwt";
import type { Session } from "@/types/auth.types";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/constants/app.constants";

/**
 * Reads the access token (or falls back to refresh token) from httpOnly cookies and verifies it.
 * Returns the session payload or null if missing / invalid.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

    // 1. Attempt access token verification
    if (accessToken) {
      try {
        const payload = verifyAccessToken(accessToken);
        return {
          userId: payload.userId,
          email: payload.email,
          name: payload.name,
        };
      } catch {
        // Access token expired or invalid — fall through to refresh token check
      }
    }

    // 2. Fallback to refresh token if access token is missing or expired
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    if (!refreshToken) return null;

    const refreshPayload = verifyRefreshToken(refreshToken);
    const session: Session = {
      userId: refreshPayload.userId,
      email: refreshPayload.email,
      name: refreshPayload.name,
    };

    // 3. Issue a fresh access token and update cookieStore for client
    try {
      const newAccessToken = signAccessToken({
        userId: session.userId,
        email: session.email,
        name: session.name,
      });

      const isProd = process.env.NODE_ENV === "production";
      cookieStore.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 15 * 60, // 15 minutes
        path: "/",
      });
    } catch {
      // Setting cookies in read context can be ignored, session payload is still valid
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Like getSession(), but redirects to /login if no valid session exists.
 * Use this in Server Components and Route Handlers that require authentication.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // TypeScript narrowing: after redirect(), this point is only reached with a valid session.
  return session;
}

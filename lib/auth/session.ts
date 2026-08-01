import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "./jwt";
import type { Session } from "@/types/auth.types";
import { ACCESS_TOKEN_COOKIE } from "@/constants/app.constants";

/**
 * Reads the access token from the httpOnly cookie and verifies it.
 * Returns the session payload or null if missing / invalid.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

    if (!token) return null;

    const payload = verifyAccessToken(token);

    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    // Token is expired or invalid
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

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, verifyRefreshToken, signAccessToken } from "@/lib/auth/jwt";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/constants/app.constants";
import { ROUTES } from "@/constants/routes.constants";

// Routes that are accessible without authentication
const PUBLIC_ROUTES = [ROUTES.LOGIN, ROUTES.REGISTER];

// API routes that bypass middleware (handled by individual route handlers)
const PUBLIC_API_ROUTES = ["/api/auth/login", "/api/auth/register", "/api/auth/refresh"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth pages
  if (PUBLIC_ROUTES.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // ─── Attempt to verify the access token ──────────────────────────────────
  if (accessToken) {
    try {
      verifyAccessToken(accessToken);
      // Valid access token — allow request
      return NextResponse.next();
    } catch {
      // Access token expired or invalid — attempt silent refresh below
    }
  }

  // ─── Attempt silent token refresh ────────────────────────────────────────
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);

      // Issue a new access token
      const newAccessToken = signAccessToken({
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
      });

      const response = NextResponse.next();

      // Set the refreshed access token cookie
      response.cookies.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60, // 15 minutes
        path: "/",
      });

      return response;
    } catch {
      // Refresh token also invalid — redirect to login
    }
  }

  // ─── No valid tokens — redirect to login ─────────────────────────────────
  // For API routes, return 401 instead of redirecting
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const loginUrl = new URL(ROUTES.LOGIN, request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { AuthService } from "@/services/auth.service";
import { successResponse, unauthorizedResponse, internalErrorResponse } from "@/lib/response";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/constants/app.constants";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!token) {
      return unauthorizedResponse();
    }

    const { accessToken, refreshToken } = await AuthService.refresh(token);

    const isProd = process.env.NODE_ENV === "production";

    cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return successResponse(null, "Token refresh successful");
  } catch (error: any) {
    if (
      error.message === "USER_NOT_FOUND" ||
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return unauthorizedResponse();
    }
    return internalErrorResponse();
  }
}

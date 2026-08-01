import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { successResponse, internalErrorResponse } from "@/lib/response";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/constants/app.constants";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === "production";

    // Delete cookies by setting maxAge: 0
    cookieStore.set(ACCESS_TOKEN_COOKIE, "", {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    cookieStore.set(REFRESH_TOKEN_COOKIE, "", {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return successResponse(null, "Logout successful");
  } catch {
    return internalErrorResponse();
  }
}

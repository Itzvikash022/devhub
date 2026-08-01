import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { AuthService } from "@/services/auth.service";
import { loginSchema } from "@/schemas/auth.schema";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/constants/app.constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid login credentials.";
      return validationErrorResponse(errorMsg);
    }

    const { session, accessToken, refreshToken } = await AuthService.login(parseResult.data);

    const isProd = process.env.NODE_ENV === "production";
    const cookieStore = await cookies();

    // Set JWT cookies
    cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return successResponse(session, "Login successful");
  } catch (error: any) {
    if (error.message === "INVALID_CREDENTIALS") {
      // General error message for security, preventing user enumeration
      return errorResponse("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }
    return internalErrorResponse();
  }
}

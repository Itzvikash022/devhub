import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { AuthService } from "@/services/auth.service";
import { registerSchema } from "@/schemas/auth.schema";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/constants/app.constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = registerSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid registration fields.";
      return validationErrorResponse(errorMsg);
    }

    const session = await AuthService.register(parseResult.data);

    // Auto-login registered user
    const accessToken = signAccessToken(session);
    const refreshToken = signRefreshToken(session);

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

    return successResponse(session, "Registration successful", 201);
  } catch (error: any) {
    if (error.message === "EMAIL_TAKEN") {
      return errorResponse("EMAIL_TAKEN", "Email address is already registered.", 400);
    }
    return internalErrorResponse();
  }
}

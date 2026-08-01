import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PasswordService } from "@/services/password.service";
import { createPasswordSchema } from "@/schemas/password.schema";
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId") || undefined;

    const passwords = await PasswordService.list(session.userId, projectId);
    return successResponse(passwords);
  } catch {
    return internalErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const parseResult = createPasswordSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid password inputs.";
      return validationErrorResponse(errorMsg);
    }

    const password = await PasswordService.create(session.userId, parseResult.data);
    return successResponse(password, "Credential created successfully", 201);
  } catch {
    return internalErrorResponse();
  }
}

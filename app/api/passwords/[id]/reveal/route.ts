import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PasswordService } from "@/services/password.service";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const decryptedSecret = await PasswordService.revealSecret(session.userId, id);
    return successResponse({ secret: decryptedSecret }, "Secret decrypted successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Password Item");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    return internalErrorResponse();
  }
}

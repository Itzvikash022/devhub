import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { DocumentService } from "@/services/document.service";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
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

    const documents = await DocumentService.list(session.userId, projectId);
    return successResponse(documents);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Project");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    return internalErrorResponse();
  }
}

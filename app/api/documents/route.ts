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
    const pageStr = searchParams.get("page");

    if (pageStr) {
      const page = Math.max(parseInt(pageStr) || 1, 1);
      const pageSize = Math.max(parseInt(searchParams.get("pageSize") || "25") || 25, 1);
      const search = searchParams.get("search") || "";
      const category = searchParams.get("category") || "";
      const extension = searchParams.get("extension") || "";
      const uploadDate = searchParams.get("uploadDate") || "";
      const sortBy = searchParams.get("sortBy") || "";

      const result = await DocumentService.listPaginated(
        session.userId,
        projectId,
        { search, category, extension, uploadDate },
        { page, pageSize, sortBy }
      );
      return successResponse(result);
    }

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

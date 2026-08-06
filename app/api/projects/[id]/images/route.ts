import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ImageAssetService } from "@/services/image-asset.service";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id: projectId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const sortBy = searchParams.get("sortBy") || undefined;

    if (page || pageSize || search || category || sortBy) {
      const pageNum = page ? parseInt(page, 10) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 30;

      const result = await ImageAssetService.listByProjectIdPaginated(
        session.userId,
        projectId,
        { search, category },
        { page: pageNum, pageSize: pageSizeNum, sortBy }
      );
      return successResponse(result);
    }

    const images = await ImageAssetService.listByProjectId(session.userId, projectId);
    return successResponse(images);
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

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ImageAssetService } from "@/services/image-asset.service";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const sortBy = searchParams.get("sortBy") || undefined;

    if (page || pageSize || search || category || sortBy) {
      const pageNum = page ? parseInt(page, 10) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 30;

      const result = await ImageAssetService.listAllPaginated(
        session.userId,
        { search, category },
        { page: pageNum, pageSize: pageSizeNum, sortBy }
      );
      return successResponse(result);
    }

    const images = await ImageAssetService.listAll(session.userId);
    return successResponse(images);
  } catch (error) {
    console.error("GET /api/images error:", error);
    return internalErrorResponse();
  }
}

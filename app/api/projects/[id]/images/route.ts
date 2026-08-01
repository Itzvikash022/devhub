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

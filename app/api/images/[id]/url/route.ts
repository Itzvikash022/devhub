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

    const { id } = await params;
    const downloadUrl = await ImageAssetService.getDownloadUrl(session.userId, id);
    return successResponse({ downloadUrl });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Image Asset");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    if (errorMsg === "CANNOT_RETRIEVE_ENCRYPTED_DIRECTLY") {
      return forbiddenResponse();
    }
    return internalErrorResponse();
  }
}

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

    const images = await ImageAssetService.listAll(session.userId);
    return successResponse(images);
  } catch (error) {
    console.error("GET /api/images error:", error);
    return internalErrorResponse();
  }
}

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ImageAssetService } from "@/services/image-asset.service";
import { confirmImageAssetSchema } from "@/schemas/image-asset.schema";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const parseResult = confirmImageAssetSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid upload configuration.";
      return validationErrorResponse(errorMsg);
    }

    const image = await ImageAssetService.confirmUpload(
      session.userId,
      projectId,
      parseResult.data
    );

    return successResponse(image, "Image registered successfully", 201);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Project");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    if (errorMsg === "FILE_TOO_LARGE") {
      return validationErrorResponse("Image file size exceeds the 10MB limit.");
    }
    return internalErrorResponse();
  }
}

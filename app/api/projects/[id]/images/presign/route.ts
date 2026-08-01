import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ImageAssetService } from "@/services/image-asset.service";
import { presignImageAssetSchema } from "@/schemas/image-asset.schema";
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
    const parseResult = presignImageAssetSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid file parameters.";
      return validationErrorResponse(errorMsg);
    }

    const result = await ImageAssetService.getPresignedUpload(
      session.userId,
      projectId,
      parseResult.data.fileName,
      parseResult.data.fileType
    );

    return successResponse(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Project");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    if (errorMsg === "UNSUPPORTED_FILE_TYPE") {
      return validationErrorResponse("Unsupported image file format.");
    }
    return internalErrorResponse();
  }
}

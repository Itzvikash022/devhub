import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ImageAssetService } from "@/services/image-asset.service";
import { presignBatchSchema } from "@/schemas/image-asset.schema";
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
    const parseResult = presignBatchSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid batch configuration.";
      return validationErrorResponse(errorMsg);
    }

    const results = [];
    for (const file of parseResult.data.files) {
      const res = await ImageAssetService.getPresignedUpload(
        session.userId,
        projectId,
        file.fileName,
        file.fileType
      );
      results.push({
        fileName: file.fileName,
        uploadUrl: res.uploadUrl,
        r2Key: res.r2Key,
      });
    }

    return successResponse(results);
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

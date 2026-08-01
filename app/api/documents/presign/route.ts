import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { DocumentService } from "@/services/document.service";
import { presignDocumentSchema } from "@/schemas/document.schema";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const parseResult = presignDocumentSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid file details.";
      return validationErrorResponse(errorMsg);
    }

    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId") || null;

    const result = await DocumentService.getPresignedUpload(
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
      return validationErrorResponse("Unsupported document file format.");
    }
    return internalErrorResponse();
  }
}

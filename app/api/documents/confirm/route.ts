import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { DocumentService } from "@/services/document.service";
import { confirmDocumentSchema } from "@/schemas/document.schema";
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
    const parseResult = confirmDocumentSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid upload parameters.";
      return validationErrorResponse(errorMsg);
    }

    const doc = await DocumentService.confirmUpload(session.userId, parseResult.data);
    return successResponse(doc, "Document uploaded and registered successfully", 201);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Project");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    if (errorMsg === "FILE_TOO_LARGE") {
      return validationErrorResponse("Document file size exceeds the 25MB limit.");
    }
    return internalErrorResponse();
  }
}

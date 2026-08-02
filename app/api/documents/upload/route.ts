import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { DocumentService } from "@/services/document.service";
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "";
    const category = (formData.get("category") as string) || "other";
    const projectId = (formData.get("projectId") as string) || null;

    if (!file) {
      return validationErrorResponse("No file provided.");
    }

    const doc = await DocumentService.directUpload(
      session.userId,
      file,
      title,
      category,
      projectId
    );

    return successResponse(doc, "Document uploaded successfully.", 201);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Project");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    if (errorMsg === "FILE_TOO_LARGE") {
      return validationErrorResponse("File size exceeds limit.");
    }
    if (errorMsg === "UNSUPPORTED_FILE_TYPE") {
      return validationErrorResponse("Unsupported document file format.");
    }
    return internalErrorResponse();
  }
}

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { DocumentService } from "@/services/document.service";
import { updateDocumentSchema } from "@/schemas/document.schema";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();
    const parseResult = updateDocumentSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid update properties.";
      return validationErrorResponse(errorMsg);
    }

    const updated = await DocumentService.update(session.userId, id, parseResult.data);
    return successResponse(updated, "Document metadata updated successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Document");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    return internalErrorResponse();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    await DocumentService.delete(session.userId, id);
    return successResponse(null, "Document deleted successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Document");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    return internalErrorResponse();
  }
}

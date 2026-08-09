import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ProjectService } from "@/services/project.service";
import { updateProjectSchema } from "@/schemas/project.schema";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const project = await ProjectService.getById(session.userId, id);
    return successResponse(project);
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return notFoundResponse("Project");
    }
    if (error.message === "FORBIDDEN") {
      return forbiddenResponse();
    }
    return internalErrorResponse();
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();
    const parseResult = updateProjectSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid update fields.";
      return validationErrorResponse(errorMsg);
    }

    const updated = await ProjectService.update(session.userId, id, parseResult.data);
    return successResponse(updated, "Project updated successfully");
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return notFoundResponse("Project");
    }
    if (error.message === "FORBIDDEN") {
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
    const body = await request.json();
    const { password } = body;

    await ProjectService.delete(session.userId, id, password);
    return successResponse(null, "Project deleted successfully");
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return notFoundResponse("Project");
    }
    if (error.message === "FORBIDDEN" || error.message === "FORBIDDEN_NOT_OWNER") {
      return forbiddenResponse();
    }
    if (error.message === "INVALID_PASSWORD") {
      return validationErrorResponse("Invalid password provided.");
    }
    return internalErrorResponse();
  }
}

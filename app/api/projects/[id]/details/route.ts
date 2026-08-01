import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ProjectDetailService } from "@/services/project-detail.service";
import { updateProjectDetailSchema } from "@/schemas/project-detail.schema";
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

    const { id: projectId } = await params;
    const details = await ProjectDetailService.getByProjectId(session.userId, projectId);
    return successResponse(details);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Project");
    }
    if (errorMsg === "FORBIDDEN") {
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

    const { id: projectId } = await params;
    const body = await request.json();
    const parseResult = updateProjectDetailSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid project details format.";
      return validationErrorResponse(errorMsg);
    }

    const updated = await ProjectDetailService.update(session.userId, projectId, parseResult.data);
    return successResponse(updated, "Project details updated successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Project");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    return internalErrorResponse();
  }
}

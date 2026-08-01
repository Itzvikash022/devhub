import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PipelineService } from "@/services/pipeline.service";
import { createPipelineItemSchema } from "@/schemas/pipeline.schema";
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
    const items = await PipelineService.listByProjectId(session.userId, projectId);
    return successResponse(items);
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const parseResult = createPipelineItemSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid pipeline item input.";
      return validationErrorResponse(errorMsg);
    }

    const item = await PipelineService.create(session.userId, projectId, parseResult.data);
    return successResponse(item, "Pipeline item created successfully", 201);
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

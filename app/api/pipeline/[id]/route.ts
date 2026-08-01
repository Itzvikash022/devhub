import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PipelineService } from "@/services/pipeline.service";
import { updatePipelineItemSchema } from "@/schemas/pipeline.schema";
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
    const parseResult = updatePipelineItemSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg =
        parseResult.error.issues[0]?.message || "Invalid pipeline item update input.";
      return validationErrorResponse(errorMsg);
    }

    const updated = await PipelineService.update(session.userId, id, parseResult.data);
    return successResponse(updated, "Pipeline item updated successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Pipeline Item");
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
    await PipelineService.delete(session.userId, id);
    return successResponse(null, "Pipeline item deleted successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Pipeline Item");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    return internalErrorResponse();
  }
}

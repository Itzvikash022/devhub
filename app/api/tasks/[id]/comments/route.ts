import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { TaskService } from "@/services/task.service";
import { createCommentSchema } from "@/schemas/task.schema";
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

    const { id } = await params;
    const body = await request.json();
    const parseResult = createCommentSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid comment text.";
      return validationErrorResponse(errorMsg);
    }

    const task = await TaskService.addComment(session.userId, id, parseResult.data.text);
    return successResponse(task, "Comment added successfully", 201);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Task");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    return internalErrorResponse();
  }
}

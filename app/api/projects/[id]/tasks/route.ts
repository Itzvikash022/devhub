import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { TaskService } from "@/services/task.service";
import { createTaskSchema } from "@/schemas/task.schema";
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
    const tasks = await TaskService.listByProjectId(session.userId, projectId);
    return successResponse(tasks);
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
    const parseResult = createTaskSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid task input.";
      return validationErrorResponse(errorMsg);
    }

    const task = await TaskService.create(session.userId, projectId, parseResult.data);
    return successResponse(task, "Task created successfully", 201);
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

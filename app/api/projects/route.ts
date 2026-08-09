import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ProjectService } from "@/services/project.service";
import { createProjectSchema } from "@/schemas/project.schema";
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") || undefined;

    const projects = await ProjectService.list(session.userId, { status });
    const NoteModel = (await import("@/models/Note")).Note;
    const TaskModel = (await import("@/models/Task")).Task;
    const projectsWithCounts = await Promise.all(
      projects.map(async (p) => {
        const noteCount = await NoteModel.countDocuments({ projectId: p._id });
        const taskCount = await TaskModel.countDocuments({ projectId: p._id });
        return {
          ...p.toObject(),
          noteCount,
          taskCount,
        };
      })
    );
    return successResponse(projectsWithCounts);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : String(error) } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const parseResult = createProjectSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid project fields.";
      return validationErrorResponse(errorMsg);
    }

    const project = await ProjectService.create(session.userId, parseResult.data);
    return successResponse(project, "Project created successfully", 201);
  } catch {
    return internalErrorResponse();
  }
}

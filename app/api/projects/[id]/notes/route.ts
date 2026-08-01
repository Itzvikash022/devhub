import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { NoteService } from "@/services/note.service";
import { createNoteSchema } from "@/schemas/note.schema";
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
    const notes = await NoteService.listByProjectId(session.userId, projectId);
    return successResponse(notes);
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id: projectId } = await params;
    const body = await request.json().catch(() => ({}));
    const parseResult = createNoteSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid note fields.";
      return validationErrorResponse(errorMsg);
    }

    const note = await NoteService.create(session.userId, projectId, parseResult.data);
    return successResponse(note, "Note created successfully", 201);
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

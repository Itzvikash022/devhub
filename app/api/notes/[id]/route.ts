import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { NoteService } from "@/services/note.service";
import { updateNoteSchema } from "@/schemas/note.schema";
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
    const note = await NoteService.getById(session.userId, id);
    return successResponse(note);
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return notFoundResponse("Note");
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
    const parseResult = updateNoteSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid update fields.";
      return validationErrorResponse(errorMsg);
    }

    const updated = await NoteService.update(session.userId, id, parseResult.data);
    return successResponse(updated, "Note updated successfully");
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return notFoundResponse("Note");
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
    await NoteService.delete(session.userId, id);
    return successResponse(null, "Note deleted successfully");
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return notFoundResponse("Note");
    }
    if (error.message === "FORBIDDEN") {
      return forbiddenResponse();
    }
    return internalErrorResponse();
  }
}

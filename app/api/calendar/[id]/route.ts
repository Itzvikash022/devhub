import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { CalendarService } from "@/services/calendar.service";
import { updateCalendarEventSchema } from "@/schemas/calendar-event.schema";
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
    const parseResult = updateCalendarEventSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid update options.";
      return validationErrorResponse(errorMsg);
    }

    const updated = await CalendarService.update(session.userId, id, parseResult.data);
    return successResponse(updated, "Event updated successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Calendar Event");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    if (errorMsg === "CANNOT_MODIFY_AUTO_EVENT") {
      return validationErrorResponse("Auto-generated events cannot be manually edited.");
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
    await CalendarService.delete(session.userId, id);
    return successResponse(null, "Event deleted successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Calendar Event");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    if (errorMsg === "CANNOT_MODIFY_AUTO_EVENT") {
      return validationErrorResponse("Auto-generated events cannot be manually deleted.");
    }
    return internalErrorResponse();
  }
}

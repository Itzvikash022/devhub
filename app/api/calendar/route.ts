import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { CalendarService } from "@/services/calendar.service";
import { createCalendarEventSchema } from "@/schemas/calendar-event.schema";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
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
    const projectId = searchParams.get("projectId") || undefined;

    const events = await CalendarService.list(session.userId, projectId);
    return successResponse(events);
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

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const parseResult = createCalendarEventSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid event configuration.";
      return validationErrorResponse(errorMsg);
    }

    const event = await CalendarService.create(session.userId, parseResult.data);
    return successResponse(event, "Event created successfully", 201);
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

import { NextResponse } from "next/server";
import type { ApiSuccess, ApiError } from "@/types/api.types";

/**
 * Returns a standardized successful JSON response.
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Returns a standardized error JSON response.
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}

// ─── Common error helpers ─────────────────────────────────────────────────────

export const unauthorizedResponse = () =>
  errorResponse("UNAUTHORIZED", "Authentication required.", 401);

export const forbiddenResponse = () =>
  errorResponse("FORBIDDEN", "You do not have permission to access this resource.", 403);

export const notFoundResponse = (resource: string = "Resource") =>
  errorResponse("NOT_FOUND", `${resource} not found.`, 404);

export const validationErrorResponse = (message: string) =>
  errorResponse("VALIDATION_ERROR", message, 400);

export const internalErrorResponse = () =>
  errorResponse("INTERNAL_ERROR", "An unexpected error occurred. Please try again.", 500);

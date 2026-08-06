import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { DocumentService } from "@/services/document.service";
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return validationErrorResponse("An array of document IDs is required for deletion.");
    }

    const result = await DocumentService.bulkDelete(session.userId, ids);

    return successResponse(
      result,
      `Successfully deleted ${result.successCount} document(s). ${
        result.failedCount ? `Failed to delete ${result.failedCount} document(s).` : ""
      }`.trim()
    );
  } catch (error) {
    return internalErrorResponse();
  }
}

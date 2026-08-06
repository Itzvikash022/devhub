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
      return validationErrorResponse("An array of document IDs is required.");
    }

    const urls = await Promise.all(
      ids.map(async (id) => {
        try {
          const downloadUrl = await DocumentService.getDownloadUrl(session.userId, id);
          return { id, downloadUrl };
        } catch {
          return { id, downloadUrl: null };
        }
      })
    );

    return successResponse(urls);
  } catch (error) {
    return internalErrorResponse();
  }
}

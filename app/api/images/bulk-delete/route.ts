import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ImageAssetService } from "@/services/image-asset.service";
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const parseResult = bulkDeleteSchema.safeParse(body);
    if (!parseResult.success) {
      return validationErrorResponse("Invalid bulk delete payload.");
    }

    for (const id of parseResult.data.ids) {
      await ImageAssetService.delete(session.userId, id);
    }

    return successResponse(null, "Images deleted successfully");
  } catch (error) {
    console.error("POST /api/images/bulk-delete error:", error);
    return internalErrorResponse();
  }
}

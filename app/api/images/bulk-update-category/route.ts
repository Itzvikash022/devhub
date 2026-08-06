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

const bulkCategorySchema = z.object({
  ids: z.array(z.string().min(1)),
  category: z.enum(["mockup", "screenshot", "architecture", "asset", "other"]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const parseResult = bulkCategorySchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid category update payload.";
      return validationErrorResponse(errorMsg);
    }

    await ImageAssetService.bulkUpdateCategory(
      session.userId,
      parseResult.data.ids,
      parseResult.data.category
    );

    return successResponse(null, "Categories updated successfully");
  } catch (error) {
    console.error("POST /api/images/bulk-update-category error:", error);
    return internalErrorResponse();
  }
}

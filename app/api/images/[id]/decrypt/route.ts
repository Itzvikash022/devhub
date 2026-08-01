import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ImageAssetService } from "@/services/image-asset.service";
import { decryptImageAssetSchema } from "@/schemas/image-asset.schema";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();
    const parseResult = decryptImageAssetSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Passphrase is required.";
      return validationErrorResponse(errorMsg);
    }

    const decryptedData = await ImageAssetService.decryptData(
      session.userId,
      id,
      parseResult.data.passphrase
    );

    return successResponse({ decryptedData }, "Decryption successful");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Image");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    if (errorMsg === "INCORRECT_PASSPHRASE") {
      return validationErrorResponse("Incorrect passphrase. Decryption failed.");
    }
    return internalErrorResponse();
  }
}

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ImageAssetService } from "@/services/image-asset.service";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id: projectId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "";
    const category = (formData.get("category") as string) || "mockup";
    const description = (formData.get("description") as string) || "";
    const passphrase = (formData.get("passphrase") as string) || null;

    if (!file) {
      return validationErrorResponse("No file provided.");
    }

    const asset = await ImageAssetService.directUpload(
      session.userId,
      projectId,
      file,
      name,
      category,
      description,
      passphrase
    );

    return successResponse(asset, "Image uploaded successfully.", 201);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Project");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    if (errorMsg === "FILE_TOO_LARGE") {
      return validationErrorResponse("File size exceeds limit.");
    }
    if (errorMsg === "UNSUPPORTED_FILE_TYPE") {
      return validationErrorResponse("Unsupported image file format.");
    }
    return internalErrorResponse();
  }
}

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ProjectService } from "@/services/project.service";
import { presignScreenshotSchema } from "@/schemas/task.schema";
import { generatePresignedUploadUrl } from "@/lib/r2";
import { ALLOWED_IMAGE_TYPES } from "@/constants/app.constants";
import { randomUUID } from "crypto";
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

    const { id: projectId } = await params;
    
    // Verify project ownership
    await ProjectService.getById(session.userId, projectId);

    const body = await request.json();
    const parseResult = presignScreenshotSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid file parameters.";
      return validationErrorResponse(errorMsg);
    }

    const { fileName, fileType, bugNumber } = parseResult.data;

    // Validate type constraints (images only)
    if (!ALLOWED_IMAGE_TYPES.includes(fileType as any)) {
      return validationErrorResponse("Unsupported image file format.");
    }

    // Generate unique key to prevent collisions
    const uuid = randomUUID();
    const extension = fileName.split(".").pop() || "png";
    const baseName = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
    
    // Sanitize base name
    const sanitizedFileName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const r2Key = `bugs/${projectId}/${bugNumber}/${uuid}-${sanitizedFileName}.${extension}`;

    const uploadUrl = await generatePresignedUploadUrl(r2Key, fileType);
    
    const publicUrlPrefix = process.env.CLOUDFLARE_R2_PUBLIC_URL || "";
    const sanitizedPrefix = publicUrlPrefix.replace(/\/$/, "");
    const publicUrl = `${sanitizedPrefix}/${r2Key}`;

    return successResponse({ uploadUrl, publicUrl, r2Key });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "NOT_FOUND") {
      return notFoundResponse("Project");
    }
    if (errorMsg === "FORBIDDEN") {
      return forbiddenResponse();
    }
    console.error("Presign screenshot error:", error);
    return internalErrorResponse();
  }
}

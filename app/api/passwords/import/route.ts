import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PasswordService } from "@/services/password.service";
import { createPasswordSchema } from "@/schemas/password.schema";
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
    const { items, projectId } = body;

    if (!Array.isArray(items)) {
      return validationErrorResponse("Invalid items payload. Expected an array.");
    }

    const results = {
      importedCount: 0,
      failedCount: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemIndex = item.lineNum || (i + 1);

      const username = item.username?.trim();
      const secret = item.secret?.trim(); // trim extra spaces in password

      if (!username || !secret) {
        let missing = [];
        if (!username) missing.push("username/ID");
        if (!secret) missing.push("password");
        results.failedCount++;
        results.errors.push(`Row ${itemIndex}: Missing ${missing.join(" and ")}.`);
        continue;
      }

      // Generate service name if missing: "Imported 1", "Imported 2", etc.
      // We base it on current successfully imported count + 1
      const label = item.label?.trim() || `Imported ${results.importedCount + 1}`;

      const payload = {
        label,
        username,
        secret,
        projectId: projectId || null,
        category: "other" as const,
        url: null,
        notes: "Imported credential",
      };

      const parseResult = createPasswordSchema.safeParse(payload);
      if (!parseResult.success) {
        results.failedCount++;
        results.errors.push(
          `Row ${itemIndex}: ${parseResult.error.issues[0]?.message || "Validation failed."}`
        );
        continue;
      }

      try {
        await PasswordService.create(session.userId, parseResult.data);
        results.importedCount++;
      } catch (error) {
        results.failedCount++;
        results.errors.push(`Row ${itemIndex}: Failed to save to database.`);
      }
    }

    return successResponse(results, "Import processed successfully");
  } catch (error) {
    console.error("Import passwords API error:", error);
    return internalErrorResponse();
  }
}

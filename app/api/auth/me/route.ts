import { successResponse, unauthorizedResponse, internalErrorResponse } from "@/lib/response";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return unauthorizedResponse();
    }

    return successResponse(session);
  } catch {
    return internalErrorResponse();
  }
}

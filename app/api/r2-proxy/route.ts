import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getObject } from "@/lib/r2";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) {
    return new NextResponse("Missing key", { status: 400 });
  }

  try {
    const buffer = await getObject(key);
    
    // Detect content type from extension
    const ext = key.split(".").pop()?.toLowerCase();
    let contentType = "image/png";
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    if (ext === "gif") contentType = "image/gif";
    if (ext === "webp") contentType = "image/webp";
    if (ext === "svg") contentType = "image/svg+xml";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("R2 proxy error:", error);
    return new NextResponse("Not Found", { status: 404 });
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return NextResponse.json({
    prefix: process.env.CLOUDFLARE_R2_PUBLIC_URL || "https://pub-placeholder.r2.dev",
  });
}

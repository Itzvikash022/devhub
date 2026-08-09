import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { InvitationService } from "@/services/invitation.service";
import { UserRepository } from "@/repositories/user.repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const user = await UserRepository.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (body.action === "accept") {
      await InvitationService.acceptInvitation(session.userId, user.email, id);
      return NextResponse.json({ success: true });
    } else if (body.action === "reject") {
      await InvitationService.rejectInvitation(user.email, id);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    if (error.message === "INVITATION_NOT_FOUND" || error.message === "FORBIDDEN" || error.message === "INVITATION_NOT_PENDING") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

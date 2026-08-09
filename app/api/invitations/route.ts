import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { InvitationService } from "@/services/invitation.service";
import { z } from "zod";

const createInvitationSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  email: z.string().email("Invalid email address"),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createInvitationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.errors },
        { status: 400 }
      );
    }

    const invitation = await InvitationService.inviteUser(
      session.userId,
      result.data.projectId,
      result.data.email
    );

    return NextResponse.json(invitation, { status: 201 });
  } catch (error: any) {
    if (
      error.message === "ONLY_OWNER_CAN_INVITE" ||
      error.message === "CANNOT_INVITE_OWNER" ||
      error.message === "USER_ALREADY_IN_PROJECT" ||
      error.message === "INVITATION_ALREADY_SENT"
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's email from the session to list pending invitations
    // Note: getSession() currently only returns userId. We may need to fetch the user.
    // Let's import UserRepository to get the email.
    const { UserRepository } = await import("@/repositories/user.repository");
    const user = await UserRepository.findById(session.userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const invitations = await InvitationService.getPendingInvitationsForUser(user.email);
    return NextResponse.json(invitations);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

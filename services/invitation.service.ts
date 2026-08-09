import { InvitationRepository } from "@/repositories/invitation.repository";
import { ProjectService } from "@/services/project.service";
import { IProjectInvitationDocument } from "@/models/ProjectInvitation";
import { UserRepository } from "@/repositories/user.repository";

export class InvitationService {
  /**
   * Invites a user to a project by email.
   */
  static async inviteUser(
    inviterId: string,
    projectId: string,
    inviteeEmail: string,
    role: "editor" | "viewer" = "editor"
  ): Promise<IProjectInvitationDocument> {
    // 1. Verify project ownership (only owner can invite)
    const project = await ProjectService.getById(inviterId, projectId);
    
    const projectOwnerId = project.userId?._id?.toString() || project.userId?.toString();
    if (projectOwnerId !== inviterId) {
      throw new Error("ONLY_OWNER_CAN_INVITE");
    }

    // 2. Check if the user is already shared with this project
    const inviteeUser = await UserRepository.findByEmail(inviteeEmail.toLowerCase());
    if (inviteeUser) {
      if (project.userId.toString() === inviteeUser._id.toString()) {
        throw new Error("CANNOT_INVITE_OWNER");
      }
      
      const isAlreadyShared = project.sharedWith?.some(
        (id: any) => id.toString() === inviteeUser._id.toString()
      );
      
      if (isAlreadyShared) {
        throw new Error("USER_ALREADY_IN_PROJECT");
      }
    }

    // 3. Check for existing pending invitation
    const existingInvites = await InvitationRepository.findPendingByEmail(inviteeEmail);
    const alreadyInvited = existingInvites.some(
      (inv) => inv.projectId?._id?.toString() === projectId || inv.projectId?.toString() === projectId
    );
    if (alreadyInvited) {
      throw new Error("INVITATION_ALREADY_SENT");
    }

    // 4. Create the invitation
    const invitation = await InvitationRepository.create({
      projectId,
      inviterId,
      inviteeEmail,
      role, // Using "editor" by default per requirements "give all permissions for now"
    });

    return invitation;
  }

  /**
   * Lists pending invitations for a specific user (by their email).
   */
  static async getPendingInvitationsForUser(email: string): Promise<IProjectInvitationDocument[]> {
    return InvitationRepository.findPendingByEmail(email);
  }

  /**
   * Accepts an invitation.
   */
  static async acceptInvitation(userId: string, userEmail: string, invitationId: string): Promise<void> {
    const invitation = await InvitationRepository.findById(invitationId);
    if (!invitation) {
      throw new Error("INVITATION_NOT_FOUND");
    }

    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error("FORBIDDEN");
    }

    if (invitation.status !== "pending") {
      throw new Error("INVITATION_NOT_PENDING");
    }

    // Add user to project's sharedWith array
    const inviterIdStr = (invitation.inviterId as any)._id?.toString() || invitation.inviterId.toString();
    const projectIdStr = (invitation.projectId as any)._id?.toString() || invitation.projectId.toString();
    
    await ProjectService.addSharedUser(
      inviterIdStr,
      projectIdStr,
      userId
    );

    // Mark invitation as accepted (or delete it. Let's delete it for cleanliness or keep as accepted)
    await InvitationRepository.delete(invitationId);
  }

  /**
   * Rejects an invitation.
   */
  static async rejectInvitation(userEmail: string, invitationId: string): Promise<void> {
    const invitation = await InvitationRepository.findById(invitationId);
    if (!invitation) {
      throw new Error("INVITATION_NOT_FOUND");
    }

    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error("FORBIDDEN");
    }

    await InvitationRepository.delete(invitationId);
  }
}

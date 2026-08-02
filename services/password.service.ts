import { PasswordRepository } from "@/repositories/password.repository";
import { ProjectService } from "@/services/project.service";
import { CreatePasswordInput, UpdatePasswordInput } from "@/schemas/password.schema";
import { IPasswordDocument } from "@/models/Password";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

export class PasswordService {
  /**
   * Helper to verify that a password belongs to the authenticated user.
   */
  private static async verifyPasswordOwnership(
    userId: string,
    id: string
  ): Promise<IPasswordDocument> {
    const password = await PasswordRepository.findById(id);
    if (!password) {
      throw new Error("NOT_FOUND");
    }

    if (password.userId.toString() !== userId) {
      throw new Error("FORBIDDEN");
    }

    return password;
  }

  /**
   * Creates a new password record, encrypting the secret with AES-256-GCM.
   */
  static async create(userId: string, data: CreatePasswordInput): Promise<IPasswordDocument> {
    const { encryptedSecret, iv } = encryptSecret(data.secret);

    const created = await PasswordRepository.create({
      userId,
      projectId: data.projectId || null,
      label: data.label,
      username: data.username,
      encryptedSecret,
      iv,
      url: data.url || null,
      category: data.category,
      notes: data.notes || "",
    });

    if (data.projectId) {
      await ProjectService.touch(data.projectId);
    }

    // Sanitize response
    created.encryptedSecret = "";
    created.iv = "";

    return created;
  }

  /**
   * Lists all passwords belonging to the user. Sanitizes credentials data.
   */
  static async list(userId: string, projectId?: string): Promise<IPasswordDocument[]> {
    const list = await PasswordRepository.findAllByUserId(userId, projectId);

    // Sanitize the credential payload in list views
    return list.map((item) => {
      item.encryptedSecret = "";
      item.iv = "";
      return item;
    });
  }

  /**
   * Updates an existing password record, re-encrypting the secret if changed.
   */
  static async update(
    userId: string,
    id: string,
    data: UpdatePasswordInput
  ): Promise<IPasswordDocument> {
    const password = await this.verifyPasswordOwnership(userId, id);

    const updatePayload: Partial<Parameters<typeof PasswordRepository.update>[1]> = {
      label: data.label,
      username: data.username,
      url: data.url,
      category: data.category,
      projectId: data.projectId,
      notes: data.notes,
    };

    if (data.secret) {
      const { encryptedSecret, iv } = encryptSecret(data.secret);
      updatePayload.encryptedSecret = encryptedSecret;
      updatePayload.iv = iv;
    }

    const updated = await PasswordRepository.update(id, updatePayload);
    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    if (password.projectId) {
      await ProjectService.touch(password.projectId.toString());
    }
    if (data.projectId && data.projectId !== password.projectId?.toString()) {
      await ProjectService.touch(data.projectId);
    }

    // Sanitize response
    updated.encryptedSecret = "";
    updated.iv = "";

    return updated;
  }

  /**
   * Decrypts and reveals the secret on-demand.
   */
  static async revealSecret(userId: string, id: string): Promise<string> {
    const password = await this.verifyPasswordOwnership(userId, id);
    return decryptSecret(password.encryptedSecret, password.iv);
  }

  /**
   * Deletes a password record, checking ownership.
   */
  static async delete(userId: string, id: string): Promise<void> {
    const password = await this.verifyPasswordOwnership(userId, id);

    const deleted = await PasswordRepository.delete(id);
    if (!deleted) {
      throw new Error("DELETE_FAILED");
    }

    if (password.projectId) {
      await ProjectService.touch(password.projectId.toString());
    }
  }
}

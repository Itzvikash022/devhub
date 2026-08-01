import { DocumentRepository } from "@/repositories/document.repository";
import { ProjectService } from "@/services/project.service";
import { ConfirmDocumentInput, UpdateDocumentInput } from "@/schemas/document.schema";
import { IDocumentDocument } from "@/models/Document";
import { generatePresignedUploadUrl, generatePresignedDownloadUrl, deleteObject } from "@/lib/r2";
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE } from "@/constants/app.constants";
import { randomUUID } from "crypto";

export class DocumentService {
  /**
   * Helper to verify that a document belongs to the authenticated user.
   */
  private static async verifyDocumentOwnership(
    userId: string,
    id: string
  ): Promise<IDocumentDocument> {
    const doc = await DocumentRepository.findById(id);
    if (!doc) {
      throw new Error("NOT_FOUND");
    }

    if (doc.userId.toString() !== userId) {
      throw new Error("FORBIDDEN");
    }

    return doc;
  }

  /**
   * Generates a presigned upload URL for a new document.
   */
  static async getPresignedUpload(
    userId: string,
    projectId: string | null,
    fileName: string,
    fileType: string
  ): Promise<{ uploadUrl: string; r2Key: string }> {
    // If linking to a project, verify project ownership
    if (projectId) {
      await ProjectService.getById(userId, projectId);
    }

    // Validate type and size constraints
    if (!ALLOWED_DOCUMENT_TYPES.includes(fileType as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
      throw new Error("UNSUPPORTED_FILE_TYPE");
    }

    // Generate unique key to prevent collisions
    const uuid = randomUUID();
    const extension = fileName.split(".").pop() || "txt";
    const r2Key = `documents/${userId}/${projectId || "global"}/${uuid}.${extension}`;

    const uploadUrl = await generatePresignedUploadUrl(r2Key, fileType);
    return { uploadUrl, r2Key };
  }

  /**
   * Confirms/Finalizes the document upload.
   */
  static async confirmUpload(
    userId: string,
    data: ConfirmDocumentInput
  ): Promise<IDocumentDocument> {
    // If linking to a project, verify project ownership
    if (data.projectId) {
      await ProjectService.getById(userId, data.projectId);
    }

    // Enforce size limits before confirming
    if (data.fileSize > MAX_DOCUMENT_SIZE) {
      throw new Error("FILE_TOO_LARGE");
    }

    return DocumentRepository.create({
      userId,
      projectId: data.projectId || null,
      title: data.title,
      r2Key: data.r2Key,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      category: data.category,
    });
  }

  /**
   * Lists all documents belonging to a user. Optionally filters by projectId.
   */
  static async list(userId: string, projectId?: string): Promise<IDocumentDocument[]> {
    if (projectId) {
      await ProjectService.getById(userId, projectId);
    }

    return DocumentRepository.findAllByUserId(userId, projectId);
  }

  /**
   * Updates document metadata (title, category, or project link).
   */
  static async update(
    userId: string,
    id: string,
    data: UpdateDocumentInput
  ): Promise<IDocumentDocument> {
    await this.verifyDocumentOwnership(userId, id);

    // If updating projectId link, verify project ownership
    if (data.projectId) {
      await ProjectService.getById(userId, data.projectId);
    }

    const updated = await DocumentRepository.update(id, data);
    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    return updated;
  }

  /**
   * Generates a short-lived download URL.
   */
  static async getDownloadUrl(userId: string, id: string): Promise<string> {
    const doc = await this.verifyDocumentOwnership(userId, id);
    return generatePresignedDownloadUrl(doc.r2Key);
  }

  /**
   * Deletes a document, checking ownership and ensuring R2 deletion succeeds.
   */
  static async delete(userId: string, id: string): Promise<void> {
    const doc = await this.verifyDocumentOwnership(userId, id);

    // 1. Delete object from R2 first. If this fails, the method throws and DB record is untouched.
    await deleteObject(doc.r2Key);

    // 2. Delete MongoDB metadata record
    const deleted = await DocumentRepository.delete(id);
    if (!deleted) {
      throw new Error("DELETE_FAILED");
    }
  }
}

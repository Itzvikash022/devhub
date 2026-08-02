import { ImageAssetRepository } from "@/repositories/image-asset.repository";
import { ProjectService } from "@/services/project.service";
import { ConfirmImageAssetInput } from "@/schemas/image-asset.schema";
import { IImageAssetDocument } from "@/models/ImageAsset";
import { encrypt, decrypt } from "@/lib/crypto";
import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  deleteObject,
  getObject,
  putObject,
} from "@/lib/r2";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/constants/app.constants";
import { randomUUID } from "crypto";

export class ImageAssetService {
  /**
   * Helper to verify that an image asset belongs to a project owned by the user.
   */
  private static async verifyAssetOwnership(
    userId: string,
    id: string
  ): Promise<IImageAssetDocument> {
    const asset = await ImageAssetRepository.findById(id);
    if (!asset) {
      throw new Error("NOT_FOUND");
    }

    // Verify user owns the associated project
    await ProjectService.getById(userId, asset.projectId.toString());
    return asset;
  }

  /**
   * Generates a presigned upload URL for a new image asset.
   */
  static async getPresignedUpload(
    userId: string,
    projectId: string,
    fileName: string,
    fileType: string
  ): Promise<{ uploadUrl: string; r2Key: string }> {
    // Verify project ownership
    await ProjectService.getById(userId, projectId);

    // Validate type and size constraints
    if (!ALLOWED_IMAGE_TYPES.includes(fileType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      throw new Error("UNSUPPORTED_FILE_TYPE");
    }

    // Generate unique key to prevent collisions
    const uuid = randomUUID();
    const extension = fileName.split(".").pop() || "png";
    const r2Key = `images/${userId}/${projectId}/${uuid}.${extension}`;

    const uploadUrl = await generatePresignedUploadUrl(r2Key, fileType);
    return { uploadUrl, r2Key };
  }

  /**
   * Confirms/Finalizes the image upload.
   * If a passphrase is provided, encrypts the image content on R2.
   */
  static async confirmUpload(
    userId: string,
    projectId: string,
    data: ConfirmImageAssetInput
  ): Promise<IImageAssetDocument> {
    // Verify project ownership
    await ProjectService.getById(userId, projectId);

    // Enforce size limits before confirming
    if (data.fileSize > MAX_IMAGE_SIZE) {
      throw new Error("FILE_TOO_LARGE");
    }

    const isEncrypted = !!data.passphrase;

    if (isEncrypted && data.passphrase) {
      // 1. Download raw file from R2
      const rawBuffer = await getObject(data.r2Key);

      // 2. Convert raw image to Base64 data URL
      const base64Str = rawBuffer.toString("base64");
      const dataUri = `data:${data.fileType};base64,${base64Str}`;

      // 3. Encrypt the data URI with the user's passphrase
      const encryptedPayload = encrypt(dataUri, data.passphrase);

      // 4. Overwrite R2 object with the encrypted payload string
      await putObject(data.r2Key, encryptedPayload, "text/plain");
    }

    const created = await ImageAssetRepository.create({
      projectId,
      name: data.name,
      r2Key: data.r2Key,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      category: data.category,
      description: data.description || "",
      expiryDate: data.expiryDate || null,
      isEncrypted,
    });

    if (projectId) {
      await ProjectService.touch(projectId);
    }

    // Sanitize R2 key in confirmation return if encrypted
    if (created.isEncrypted) {
      created.r2Key = "";
    }

    return created;
  }

  /**
   * Lists all image assets for a project, retrieving only metadata from MongoDB.
   * R2 keys are omitted for encrypted files in the list index view.
   */
  static async listByProjectId(userId: string, projectId: string): Promise<IImageAssetDocument[]> {
    // Verify project ownership
    await ProjectService.getById(userId, projectId);

    const list = await ImageAssetRepository.findAllByProjectId(projectId);

    return list.map((item) => {
      if (item.isEncrypted) {
        item.r2Key = "";
      }
      return item;
    });
  }

  /**
   * Lists all image assets across all projects owned by the user.
   */
  static async listAll(userId: string): Promise<IImageAssetDocument[]> {
    const projects = await ProjectService.list(userId);
    const projectIds = projects.map((p: IImageAssetDocument | any) => p._id.toString());
    const list = await ImageAssetRepository.findAllByProjectIds(projectIds);

    return list.map((item) => {
      if (item.isEncrypted) {
        item.r2Key = "";
      }
      return item;
    });
  }

  /**
   * Generates a short-lived download/view URL for non-encrypted images.
   */
  static async getDownloadUrl(userId: string, id: string): Promise<string> {
    const asset = await this.verifyAssetOwnership(userId, id);
    if (asset.isEncrypted) {
      throw new Error("CANNOT_RETRIEVE_ENCRYPTED_DIRECTLY");
    }
    return generatePresignedDownloadUrl(asset.r2Key);
  }

  /**
   * Decrypts and retrieves the full Base64 image payload using the user-provided passphrase.
   */
  static async decryptData(userId: string, id: string, passphrase: string): Promise<string> {
    const asset = await this.verifyAssetOwnership(userId, id);

    if (!asset.isEncrypted) {
      throw new Error("ASSET_NOT_ENCRYPTED");
    }

    // 1. Download encrypted payload from R2
    const encryptedBuffer = await getObject(asset.r2Key);
    const encryptedPayload = encryptedBuffer.toString("utf8");

    try {
      // 2. Decrypt base64 data
      return decrypt(encryptedPayload, passphrase);
    } catch {
      throw new Error("INCORRECT_PASSPHRASE");
    }
  }

  /**
   * Deletes an image asset, checking ownership and ensuring R2 deletion succeeds.
   */
  static async delete(userId: string, id: string): Promise<void> {
    const asset = await this.verifyAssetOwnership(userId, id);

    // 1. Delete object from R2 first. If this fails, the method throws and DB record is untouched.
    await deleteObject(asset.r2Key);

    // 2. Delete MongoDB metadata record
    const deleted = await ImageAssetRepository.delete(id);
    if (!deleted) {
      throw new Error("DELETE_FAILED");
    }

    if (asset.projectId) {
      await ProjectService.touch(asset.projectId.toString());
    }
  }

  /**
   * Directly uploads an image file to R2 via server stream and creates DB record.
   */
  static async directUpload(
    userId: string,
    projectId: string,
    file: File,
    name: string,
    category: any,
    description?: string,
    passphrase?: string | null
  ): Promise<IImageAssetDocument> {
    await ProjectService.getById(userId, projectId);

    const fileType = file.type || "image/png";
    const fileSize = file.size;

    if (fileSize > MAX_IMAGE_SIZE) {
      throw new Error("FILE_TOO_LARGE");
    }

    const uuid = randomUUID();
    const extension = file.name.split(".").pop() || "png";
    const r2Key = `images/${userId}/${projectId}/${uuid}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer | string = Buffer.from(arrayBuffer);

    const isEncrypted = !!passphrase;
    if (isEncrypted && passphrase) {
      const base64Str = buffer.toString("base64");
      const dataUri = `data:${fileType};base64,${base64Str}`;
      buffer = encrypt(dataUri, passphrase);
      await putObject(r2Key, buffer, "text/plain");
    } else {
      await putObject(r2Key, buffer, fileType);
    }

    const created = await ImageAssetRepository.create({
      projectId,
      name: name || file.name,
      r2Key,
      fileName: file.name,
      fileType,
      fileSize,
      category: category || "mockup",
      description: description || "",
      expiryDate: null,
      isEncrypted,
    });

    if (projectId) {
      await ProjectService.touch(projectId);
    }

    if (created.isEncrypted) {
      created.r2Key = "";
    }

    return created;
  }
}

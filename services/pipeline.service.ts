import { PipelineRepository } from "@/repositories/pipeline.repository";
import { ProjectService } from "@/services/project.service";
import { CreatePipelineItemInput, UpdatePipelineItemInput } from "@/schemas/pipeline.schema";
import { IPipelineItemDocument } from "@/models/PipelineItem";

export class PipelineService {
  /**
   * Helper to verify that a pipeline item belongs to a project workspace owned by the user.
   */
  private static async verifyItemOwnership(
    userId: string,
    id: string
  ): Promise<IPipelineItemDocument> {
    const item = await PipelineRepository.findById(id);
    if (!item) {
      throw new Error("NOT_FOUND");
    }

    // Verify user owns the associated project
    await ProjectService.getById(userId, item.projectId.toString());
    return item;
  }

  /**
   * Creates a new pipeline reference item.
   */
  static async create(
    userId: string,
    projectId: string,
    data: CreatePipelineItemInput
  ): Promise<IPipelineItemDocument> {
    // Verify project ownership
    await ProjectService.getById(userId, projectId);

    const created = await PipelineRepository.create({
      projectId,
      category: data.category,
      label: data.label,
      url: data.url,
      environment: data.environment || null,
      notes: data.notes || "",
    });

    await ProjectService.touch(projectId);

    return created;
  }

  /**
   * Lists all pipeline items for a project workspace, verifying project ownership.
   */
  static async listByProjectId(
    userId: string,
    projectId: string
  ): Promise<IPipelineItemDocument[]> {
    // Verify project ownership
    await ProjectService.getById(userId, projectId);

    return PipelineRepository.findAllByProjectId(projectId);
  }

  /**
   * Updates a pipeline reference item, checking ownership.
   */
  static async update(
    userId: string,
    id: string,
    data: UpdatePipelineItemInput
  ): Promise<IPipelineItemDocument> {
    const item = await this.verifyItemOwnership(userId, id);

    const updated = await PipelineRepository.update(id, data);
    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    await ProjectService.touch(item.projectId.toString());

    return updated;
  }

  /**
   * Deletes a pipeline reference item, checking ownership.
   */
  static async delete(userId: string, id: string): Promise<void> {
    const item = await this.verifyItemOwnership(userId, id);

    const deleted = await PipelineRepository.delete(id);
    if (!deleted) {
      throw new Error("DELETE_FAILED");
    }

    await ProjectService.touch(item.projectId.toString());
  }
}

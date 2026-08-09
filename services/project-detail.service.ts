import { ProjectDetailRepository } from "@/repositories/project-detail.repository";
import { ProjectService } from "@/services/project.service";
import { UpdateProjectDetailInput } from "@/schemas/project-detail.schema";
import { IProjectDetailDocument } from "@/models/ProjectDetail";

export class ProjectDetailService {
  /**
   * Retrieves structured details for a project, verifying ownership.
   * If details do not exist yet, initializes and returns an empty record.
   */
  static async getByProjectId(userId: string, projectId: string): Promise<IProjectDetailDocument> {
    // Verify ownership
    await ProjectService.getById(userId, projectId);

    let details = await ProjectDetailRepository.findByProjectId(projectId);
    if (!details) {
      details = await ProjectDetailRepository.create(projectId, userId, []);
    }

    return details;
  }

  /**
   * Updates project details, verifying ownership.
   */
  static async update(
    userId: string,
    projectId: string,
    data: UpdateProjectDetailInput
  ): Promise<IProjectDetailDocument> {
    // Verify ownership
    await ProjectService.getById(userId, projectId);

    const updated = await ProjectDetailRepository.update(projectId, data.sections, userId);
    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    await ProjectService.touch(projectId);

    return updated;
  }
}

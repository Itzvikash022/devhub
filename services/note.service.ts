import { NoteRepository } from "@/repositories/note.repository";
import { ProjectService } from "@/services/project.service";
import { CreateNoteInput, UpdateNoteInput } from "@/schemas/note.schema";
import { INoteDocument } from "@/models/Note";

export class NoteService {
  /**
   * Helper to verify that a note belongs to the user.
   */
  private static async verifyNoteOwnership(userId: string, id: string): Promise<INoteDocument> {
    const note = await NoteRepository.findById(id);
    if (!note) {
      throw new Error("NOT_FOUND");
    }

    // Verify user owns the associated project
    await ProjectService.getById(userId, note.projectId.toString());
    return note;
  }

  /**
   * Creates a new note page in a project.
   */
  static async create(
    userId: string,
    projectId: string,
    data: CreateNoteInput
  ): Promise<INoteDocument> {
    // Verify project ownership
    await ProjectService.getById(userId, projectId);

    // Calculate default order index (append to the end of notes list)
    const existingNotes = await NoteRepository.findAllByProjectId(projectId);
    const nextOrder =
      existingNotes.length > 0 ? existingNotes[existingNotes.length - 1].order + 1 : 0;

    const created = await NoteRepository.create({
      projectId,
      title: data.title || "Untitled",
      content: data.content || "[]",
      order: data.order !== undefined && data.order !== 0 ? data.order : nextOrder,
    });

    await ProjectService.touch(projectId);

    return created;
  }

  /**
   * Retrieves a single note page.
   */
  static async getById(userId: string, id: string): Promise<INoteDocument> {
    return this.verifyNoteOwnership(userId, id);
  }

  /**
   * Lists all note pages inside a project workspace.
   */
  static async listByProjectId(userId: string, projectId: string): Promise<INoteDocument[]> {
    // Verify project ownership
    await ProjectService.getById(userId, projectId);

    return NoteRepository.findAllByProjectId(projectId);
  }

  /**
   * Updates note title or content, checking ownership.
   */
  static async update(userId: string, id: string, data: UpdateNoteInput): Promise<INoteDocument> {
    // Verify ownership
    const note = await this.verifyNoteOwnership(userId, id);

    const updated = await NoteRepository.update(id, data);
    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    await ProjectService.touch(note.projectId.toString());

    return updated;
  }

  /**
   * Deletes a note page, checking ownership.
   */
  static async delete(userId: string, id: string): Promise<void> {
    // Verify ownership
    const note = await this.verifyNoteOwnership(userId, id);

    const deleted = await NoteRepository.delete(id);
    if (!deleted) {
      throw new Error("DELETE_FAILED");
    }

    await ProjectService.touch(note.projectId.toString());
  }

  /**
   * Reorders all notes in a project, checking project ownership.
   */
  static async reorder(
    userId: string,
    projectId: string,
    reorderData: Array<{ id: string; order: number }>
  ): Promise<void> {
    // Verify project ownership
    await ProjectService.getById(userId, projectId);

    await NoteRepository.updateOrders(reorderData);
    await ProjectService.touch(projectId);
  }
}

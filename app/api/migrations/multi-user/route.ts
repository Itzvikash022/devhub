import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Note } from "@/models/Note";
import { ImageAsset } from "@/models/ImageAsset";
import { ProjectDetail } from "@/models/ProjectDetail";
import { PipelineItem } from "@/models/PipelineItem";
import { Password } from "@/models/Password";

export async function POST() {
  try {
    await connectToDatabase();

    const projects = await Project.find({});
    
    let updatedTasks = 0;
    let updatedNotes = 0;
    let updatedImages = 0;
    let updatedDetails = 0;
    let updatedPipelines = 0;
    let updatedPasswords = 0;

    for (const project of projects) {
      const ownerId = project.userId;

      const tasks = await Task.updateMany(
        { projectId: project._id, createdBy: { $exists: false } },
        { $set: { createdBy: ownerId } }
      );
      updatedTasks += tasks.modifiedCount;

      const notes = await Note.updateMany(
        { projectId: project._id, createdBy: { $exists: false } },
        { $set: { createdBy: ownerId } }
      );
      updatedNotes += notes.modifiedCount;

      const images = await ImageAsset.updateMany(
        { projectId: project._id, uploadedBy: { $exists: false } },
        { $set: { uploadedBy: ownerId } }
      );
      updatedImages += images.modifiedCount;

      const details = await ProjectDetail.updateMany(
        { projectId: project._id, createdBy: { $exists: false } },
        { $set: { createdBy: ownerId } }
      );
      updatedDetails += details.modifiedCount;

      const pipelines = await PipelineItem.updateMany(
        { projectId: project._id, createdBy: { $exists: false } },
        { $set: { createdBy: ownerId } }
      );
      updatedPipelines += pipelines.modifiedCount;
      
      const passwords = await Password.updateMany(
        { projectId: project._id, isShared: { $exists: false } },
        { $set: { isShared: false } }
      );
      updatedPasswords += passwords.modifiedCount;
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully.",
      stats: {
        updatedTasks,
        updatedNotes,
        updatedImages,
        updatedDetails,
        updatedPipelines,
        updatedPasswords
      }
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Failed to run migration" },
      { status: 500 }
    );
  }
}

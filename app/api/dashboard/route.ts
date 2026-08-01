import { getSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { CalendarEvent } from "@/models/CalendarEvent";
import { Task } from "@/models/Task";
import { Note } from "@/models/Note";
import { DocumentModel } from "@/models/Document";
import { successResponse, unauthorizedResponse, internalErrorResponse } from "@/lib/response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    await connectToDatabase();
    const userId = session.userId;

    // 1. Fetch user's active/on-hold projects (sorted by updatedAt desc)
    const userProjects = await Project.find({
      userId,
      status: { $ne: "archived" },
    })
      .sort({ updatedAt: -1 })
      .exec();

    const recentProjects = userProjects.slice(0, 5);

    // Get list of project IDs to query associated notes, tasks, etc.
    const projectIds = userProjects.map((p) => p._id);

    // 2. Fetch upcoming deadlines (next 7 days starting from today's start)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysLater = new Date(
      startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000
    );

    const upcomingEvents = await CalendarEvent.find({
      userId,
      date: { $gte: startOfToday, $lte: sevenDaysLater },
    })
      .sort({ date: 1 })
      .limit(10)
      .exec();

    // 3. Fetch pending high priority tasks across all active projects
    const highPriorityTasks = await Task.find({
      projectId: { $in: projectIds },
      priority: "high",
      status: { $ne: "done" },
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .exec();

    // 4. Fetch recent activity (last 5 notes, tasks, and documents)
    const recentNotes = await Note.find({
      projectId: { $in: projectIds },
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .exec();

    const recentTasks = await Task.find({
      projectId: { $in: projectIds },
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .exec();

    const recentDocs = await DocumentModel.find({
      userId,
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .exec();

    const activities = [
      ...recentNotes.map((n) => ({
        id: n._id.toString(),
        type: "note" as const,
        title: n.title,
        updatedAt: n.updatedAt,
        projectId: n.projectId.toString(),
      })),
      ...recentTasks.map((t) => ({
        id: t._id.toString(),
        type: "task" as const,
        title: t.title,
        updatedAt: t.updatedAt,
        projectId: t.projectId.toString(),
        status: t.status,
      })),
      ...recentDocs.map((d) => ({
        id: d._id.toString(),
        type: "document" as const,
        title: d.title,
        updatedAt: d.updatedAt,
        projectId: d.projectId ? d.projectId.toString() : null,
      })),
    ];

    activities.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const recentActivity = activities.slice(0, 8);

    return successResponse({
      recentProjects,
      upcomingDeadlines: upcomingEvents,
      highPriorityTasks,
      recentActivity,
    });
  } catch (error) {
    console.error("Dashboard Aggregation Error:", error);
    return internalErrorResponse();
  }
}

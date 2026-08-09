import { getSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { CalendarEvent } from "@/models/CalendarEvent";
import { Task } from "@/models/Task";
import { Note } from "@/models/Note";
import { DocumentModel } from "@/models/Document";
import { successResponse, unauthorizedResponse, internalErrorResponse } from "@/lib/response";

import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    await connectToDatabase();
    const userId = session.userId;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    // 1. Fetch user's active/on-hold projects (sorted by updatedAt desc)
    const userProjects = await Project.find({
      $or: [{ userId }, { sharedWith: userId }],
      status: { $ne: "archived" },
    })
      .sort({ updatedAt: -1 })
      .exec();

    const projectIds = userProjects.map((p) => p._id);

    let recentProjects: any[] = [];
    if (!projectId) {
      const recentProjectsRaw = userProjects.slice(0, 3);
      recentProjects = await Promise.all(
        recentProjectsRaw.map(async (p) => {
          const noteCount = await Note.countDocuments({ projectId: p._id });
          const taskCount = await Task.countDocuments({ projectId: p._id });
          return {
            _id: p._id.toString(),
            name: p.name,
            description: p.description,
            status: p.status,
            updatedAt: p.updatedAt,
            noteCount,
            taskCount,
          };
        })
      );
    }

    // 2. Fetch upcoming deadlines (next 7 days starting from today's start)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysLater = new Date(
      startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000
    );

    const deadlineFilter: any = {
      userId,
      date: { $gte: startOfToday, $lte: sevenDaysLater },
    };
    if (projectId) {
      deadlineFilter.projectId = projectId;
    }

    const upcomingEvents = await CalendarEvent.find(deadlineFilter)
      .sort({ date: 1 })
      .limit(10)
      .exec();

    // 3. Fetch pending high priority tasks across active projects
    const taskFilter: any = {
      priority: "high",
      status: { $ne: "done" },
    };
    if (projectId) {
      taskFilter.projectId = projectId;
    } else {
      taskFilter.projectId = { $in: projectIds };
    }

    const highPriorityTasks = await Task.find(taskFilter)
      .sort({ updatedAt: -1 })
      .limit(10)
      .exec();

    // 4. Fetch recent activity (last 5 notes, tasks, and documents)
    const activityNoteFilter: any = {};
    const activityTaskFilter: any = {};
    const activityDocFilter: any = { userId };

    if (projectId) {
      activityNoteFilter.projectId = projectId;
      activityTaskFilter.projectId = projectId;
      activityDocFilter.projectId = projectId;
    } else {
      activityNoteFilter.projectId = { $in: projectIds };
      activityTaskFilter.projectId = { $in: projectIds };
    }

    const recentNotes = await Note.find(activityNoteFilter)
      .sort({ updatedAt: -1 })
      .limit(5)
      .exec();

    const recentTasks = await Task.find(activityTaskFilter)
      .sort({ updatedAt: -1 })
      .limit(5)
      .exec();

    const recentDocs = await DocumentModel.find(activityDocFilter)
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

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { Note } from "@/models/Note";
import { DocumentModel } from "@/models/Document";
import { Password } from "@/models/Password";
import { CalendarEvent } from "@/models/CalendarEvent";
import { successResponse, unauthorizedResponse, internalErrorResponse } from "@/lib/response";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q) {
      return successResponse({
        projects: [],
        notes: [],
        documents: [],
        passwords: [],
        calendarEvents: [],
      });
    }

    await connectToDatabase();
    const userId = session.userId;

    // Search active projects
    const matchingProjects = await Project.find({
      userId,
      status: { $ne: "archived" },
      name: { $regex: q, $options: "i" },
    })
      .limit(10)
      .exec();

    // Fetch all user's projects to build name mapping
    const allUserProjects = await Project.find({
      userId,
      status: { $ne: "archived" },
    }).exec();

    const projectMap = new Map(allUserProjects.map((p) => [p._id.toString(), p.name]));
    const projectIds = allUserProjects.map((p) => p._id);

    // Search notes
    const matchingNotes = await Note.find({
      projectId: { $in: projectIds },
      title: { $regex: q, $options: "i" },
    })
      .limit(10)
      .exec();

    // Search documents
    const matchingDocs = await DocumentModel.find({
      userId,
      title: { $regex: q, $options: "i" },
    })
      .limit(10)
      .exec();

    // Search passwords
    const matchingPasswords = await Password.find({
      userId,
      label: { $regex: q, $options: "i" },
    })
      .limit(10)
      .exec();

    // Search calendar events
    const matchingEvents = await CalendarEvent.find({
      userId,
      title: { $regex: q, $options: "i" },
    })
      .limit(10)
      .exec();

    return successResponse({
      projects: matchingProjects.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        status: p.status,
      })),
      notes: matchingNotes.map((n) => ({
        id: n._id.toString(),
        title: n.title,
        projectId: n.projectId.toString(),
        projectName: projectMap.get(n.projectId.toString()) || "",
      })),
      documents: matchingDocs.map((d) => ({
        id: d._id.toString(),
        title: d.title,
        projectId: d.projectId ? d.projectId.toString() : null,
        projectName: d.projectId ? projectMap.get(d.projectId.toString()) || "" : "",
      })),
      passwords: matchingPasswords.map((p) => ({
        id: p._id.toString(),
        label: p.label,
        username: p.username,
        projectId: p.projectId ? p.projectId.toString() : null,
        projectName: p.projectId ? projectMap.get(p.projectId.toString()) || "" : "",
      })),
      calendarEvents: matchingEvents.map((e) => ({
        id: e._id.toString(),
        title: e.title,
        date: e.date,
        type: e.type,
        source: e.source,
        projectId: e.projectId ? e.projectId.toString() : null,
        projectName: e.projectId ? projectMap.get(e.projectId.toString()) || "" : "",
      })),
    });
  } catch (error) {
    console.error("Global Search Error:", error);
    return internalErrorResponse();
  }
}

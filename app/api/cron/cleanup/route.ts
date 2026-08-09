import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Task } from "@/models/Task";
import { deleteObject } from "@/lib/r2";
import { successResponse, unauthorizedResponse, internalErrorResponse } from "@/lib/response";

export async function GET(request: NextRequest) {
  // Check authorization (Vercel Cron security)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorizedResponse();
  }

  try {
    await connectToDatabase();
    
    // Find bugs closed more than 30 days ago that still have screenshots
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const expiredBugs = await Task.find({
      type: "bug",
      status: "done",
      closedAt: { $ne: null, $lt: thirtyDaysAgo },
      screenshots: { $exists: true, $not: { $size: 0 } },
    }).exec();
    
    let deletedCount = 0;
    
    for (const bug of expiredBugs) {
      // Delete screenshots from R2
      for (const url of bug.screenshots) {
        try {
          const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || "";
          const r2Key = publicUrl ? url.replace(`${publicUrl}/`, "") : url;
          await deleteObject(r2Key);
        } catch (err) {
          console.error(`Failed to delete expired screenshot ${url} from R2:`, err);
        }
      }
      
      // Clear screenshots in DB
      bug.screenshots = [];
      await bug.save();
      deletedCount++;
    }
    
    return successResponse({ deletedCount }, `Cleaned up screenshots for ${deletedCount} expired bug(s)`);
  } catch (error) {
    console.error("Cron cleanup error:", error);
    return internalErrorResponse();
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Password } from "@/models/Password";
import { UserRepository } from "@/repositories/user.repository";
import { decryptSecret } from "@/lib/crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  unauthorizedResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { projectId, selectedOptions, password } = body;

    if (!password) {
      return validationErrorResponse("Profile password is required for confirmation.");
    }

    if (!Array.isArray(selectedOptions) || selectedOptions.length === 0) {
      return validationErrorResponse("At least one export scope option must be selected.");
    }

    await connectToDatabase();

    // Verify profile password
    const user = await UserRepository.findById(session.userId);
    if (!user) {
      return unauthorizedResponse();
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return validationErrorResponse("Invalid profile password.");
    }

    // Build DB Query based on selected multi-select options
    const query: any = {
      userId: new mongoose.Types.ObjectId(session.userId),
    };

    if (projectId) {
      // Project-specific view
      query.projectId = new mongoose.Types.ObjectId(projectId);
      if (!selectedOptions.includes("ALL")) {
        // Filter by selected service labels
        query.label = { $in: selectedOptions };
      }
    } else {
      // Global View
      if (!selectedOptions.includes("ALL")) {
        const queryOrBlocks: any[] = [];
        
        if (selectedOptions.includes("unlinked")) {
          queryOrBlocks.push({ projectId: null });
        }
        
        // Extract project IDs
        const projectIds = selectedOptions
          .filter(opt => opt !== "unlinked" && opt !== "ALL")
          .map(opt => new mongoose.Types.ObjectId(opt));
          
        if (projectIds.length > 0) {
          queryOrBlocks.push({ projectId: { $in: projectIds } });
        }
        
        if (queryOrBlocks.length > 0) {
          query.$or = queryOrBlocks;
        } else {
          // Empty selection
          return new NextResponse("", { status: 200 });
        }
      }
    }

    const passwords = await Password.find(query).sort({ label: 1 }).exec();

    if (passwords.length === 0) {
      return validationErrorResponse("No passwords found matching the selected scopes.");
    }

    // Decrypt passwords and map to CSV rows
    const csvRows = passwords.map((pw) => {
      let plainPassword = "";
      try {
        plainPassword = decryptSecret(pw.encryptedSecret, pw.iv).trim();
      } catch (err) {
        plainPassword = "DECRYPTION_ERROR";
      }

      // Helper to escape values in CSV format
      const escape = (str: string) => {
        const cleaned = str.replace(/"/g, '""');
        return `"${cleaned}"`;
      };

      return [escape(pw.label), escape(pw.username), escape(plainPassword)].join(",");
    });

    const csvContent = ["Service Name,ID,Password", ...csvRows].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${projectId ? 'project' : 'global'}_passwords.csv"`,
      },
    });
  } catch (error) {
    console.error("Export passwords API error:", error);
    return internalErrorResponse();
  }
}

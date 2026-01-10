"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { refreshApiKeySchema } from "@/lib/schemas";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function refreshApiKey(data: z.infer<typeof refreshApiKeySchema>) {
  try {
    const session = await requireAuth();
    const validated = refreshApiKeySchema.parse(data);

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: validated.projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return {
        success: false,
        error: "Project not found",
      };
    }

    // Generate new API key
    const newApiKey = `bb_${randomBytes(32).toString("hex")}`;

    // Update project with new API key
    const updatedProject = await prisma.project.update({
      where: { id: validated.projectId },
      data: {
        apiKey: newApiKey,
      },
    });

    revalidatePath(`/dashboard/${project.slug}/settings`, "page");

    return {
      success: true,
      apiKey: updatedProject.apiKey,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format().fieldErrors,
      };
    }

    console.error("Error refreshing API key:", error);
    return { success: false, error: "Internal server error" };
  }
}

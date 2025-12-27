"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const deleteProjectSchema = z.object({
  projectId: z.string(),
});

export async function deleteProject(data: z.infer<typeof deleteProjectSchema>) {
  try {
    const session = await requireAuth();
    const validated = deleteProjectSchema.parse(data);

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

    // Delete project (cascade will handle related data)
    await prisma.project.delete({
      where: { id: validated.projectId },
    });

    revalidatePath("/dashboard/settings", "layout");
    revalidatePath("/dashboard/projects", "layout");

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format().fieldErrors,
      };
    }

    console.error("Error deleting project:", error);
    return { success: false, error: "Internal server error" };
  }
}

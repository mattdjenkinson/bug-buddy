"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateProjectSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  allowedDomains: z.array(z.string()).optional(),
});

export async function updateProject(data: z.infer<typeof updateProjectSchema>) {
  try {
    const session = await requireAuth();
    const validated = updateProjectSchema.parse(data);

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

    // Update project
    await prisma.project.update({
      where: { id: validated.projectId },
      data: {
        name: validated.name,
        ...(validated.allowedDomains !== undefined && {
          allowedDomains: validated.allowedDomains,
        }),
      },
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

    console.error("Error updating project:", error);
    return { success: false, error: "Internal server error" };
  }
}

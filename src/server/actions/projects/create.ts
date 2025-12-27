"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function createProject(data: z.infer<typeof projectSchema>) {
  try {
    const session = await requireAuth();
    const validated = projectSchema.parse(data);

    // Generate API key
    const apiKey = `bb_${randomBytes(32).toString("hex")}`;

    const project = await prisma.project.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        apiKey,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            feedback: true,
          },
        },
      },
    });

    revalidatePath("/dashboard/projects", "layout");

    return {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        apiKey: project.apiKey,
        createdAt: project.createdAt.toISOString(),
        _count: project._count,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format().fieldErrors,
      };
    }

    console.error("Error creating project:", error);
    return { success: false, error: "Internal server error" };
  }
}

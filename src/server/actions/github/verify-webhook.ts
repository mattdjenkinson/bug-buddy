"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { verifyWebhookStatus } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const verifyWebhookSchema = z.object({
  projectId: z.string(),
});

export async function verifyWebhook(data: z.infer<typeof verifyWebhookSchema>) {
  try {
    const session = await requireAuth();
    const validated = verifyWebhookSchema.parse(data);

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: validated.projectId,
        userId: session.user.id,
      },
      include: {
        githubIntegration: true,
      },
    });

    if (!project) {
      return {
        success: false,
        error: "Project not found",
      };
    }

    if (!project.githubIntegration) {
      return {
        success: false,
        error:
          "GitHub integration not found. Please configure GitHub integration first.",
      };
    }

    const result = await verifyWebhookStatus(validated.projectId);

    revalidatePath("/dashboard/settings", "layout");

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format().fieldErrors,
      };
    }

    console.error("Error verifying webhook:", error);
    return { success: false, error: "Internal server error" };
  }
}

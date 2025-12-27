"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const generateWebhookSecretSchema = z.object({
  projectId: z.string(),
});

export async function generateWebhookSecret(
  data: z.infer<typeof generateWebhookSecretSchema>,
) {
  try {
    const session = await requireAuth();
    const validated = generateWebhookSecretSchema.parse(data);

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

    // Generate new webhook secret (32 bytes = 64 hex characters)
    const newSecret = randomBytes(32).toString("hex");

    // Update integration with new webhook secret
    const updatedIntegration = await prisma.gitHubIntegration.update({
      where: { id: project.githubIntegration.id },
      data: {
        webhookSecret: newSecret,
      },
    });

    revalidatePath("/dashboard/settings", "layout");

    return {
      success: true,
      webhookSecret: updatedIntegration.webhookSecret,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format().fieldErrors,
      };
    }

    console.error("Error generating webhook secret:", error);
    return { success: false, error: "Internal server error" };
  }
}

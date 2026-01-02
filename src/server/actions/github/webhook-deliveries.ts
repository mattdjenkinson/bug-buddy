"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { getWebhookDeliveries } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const webhookDeliveriesSchema = z.object({
  projectId: z.string(),
});

export async function getWebhookDeliveriesAction(
  data: z.infer<typeof webhookDeliveriesSchema>,
) {
  try {
    const session = await requireAuth();
    const validated = webhookDeliveriesSchema.parse(data);

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

    const result = await getWebhookDeliveries(validated.projectId);

    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format().fieldErrors,
      };
    }

    console.error("Error fetching webhook deliveries:", error);
    return { success: false, error: "Internal server error" };
  }
}

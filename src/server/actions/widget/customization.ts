"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { widgetCustomizationUpdateSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function saveWidgetCustomization(
  data: z.infer<typeof widgetCustomizationUpdateSchema>,
) {
  try {
    const session = await requireAuth();
    const validated = widgetCustomizationUpdateSchema.parse(data);

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: validated.projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // Upsert customization
    const customization = await prisma.widgetCustomization.upsert({
      where: { projectId: validated.projectId },
      update: {
        primaryColor: validated.primaryColor,
        secondaryColor: validated.secondaryColor,
        backgroundColor: validated.backgroundColor,
        fontFamily: validated.fontFamily,
        borderRadius: validated.borderRadius,
        buttonText: validated.buttonText,
        buttonPosition: validated.buttonPosition,
      },
      create: {
        projectId: validated.projectId,
        primaryColor: validated.primaryColor || "#000000",
        secondaryColor: validated.secondaryColor || "#ffffff",
        backgroundColor: validated.backgroundColor || "#ffffff",
        fontFamily: validated.fontFamily || "system-ui",
        borderRadius: validated.borderRadius || "8px",
        buttonText: validated.buttonText || "Feedback",
        buttonPosition: validated.buttonPosition || "bottom-right",
      },
    });

    revalidatePath("/dashboard/settings", "layout");
    return { success: true, customization };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format().fieldErrors,
      };
    }

    console.error("Error updating customization:", error);
    return { success: false, error: "Internal server error" };
  }
}

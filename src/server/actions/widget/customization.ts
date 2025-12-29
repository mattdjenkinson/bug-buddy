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
    const updateData = {
      primaryColor: validated.primaryColor,
      secondaryColor: validated.secondaryColor,
      fontFamily: validated.fontFamily,
      ...(validated.fontUrl !== undefined && { fontUrl: validated.fontUrl }),
      ...(validated.fontFileName !== undefined && {
        fontFileName: validated.fontFileName,
      }),
      borderRadius: validated.borderRadius,
      buttonText: validated.buttonText,
      buttonPosition: validated.buttonPosition,
    };

    const createData = {
      projectId: validated.projectId,
      primaryColor: validated.primaryColor || "#000000",
      secondaryColor: validated.secondaryColor || "#ffffff",
      fontFamily: validated.fontFamily || "system-ui",
      fontUrl: validated.fontUrl || null,
      fontFileName: validated.fontFileName || null,
      borderRadius: validated.borderRadius || "8px",
      buttonText: validated.buttonText || "Feedback",
      buttonPosition: validated.buttonPosition || "bottom-right",
    };

    const customization = await prisma.widgetCustomization.upsert({
      where: { projectId: validated.projectId },
      update: updateData,
      create: createData,
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

"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";

export async function markNotificationAsRead(notificationId: string) {
  try {
    const session = await requireAuth();

    // Verify the notification belongs to the user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
    });

    if (!notification) {
      return {
        success: false,
        error: "Notification not found",
      };
    }

    // Mark as read
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";

export async function markAllNotificationsAsRead() {
  try {
    const session = await requireAuth();

    // Mark all notifications as read for the user
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import type { NotificationWhereInput } from "@/server/prisma/generated/prisma/models";

export async function getNotifications(options?: {
  limit?: number;
  unreadOnly?: boolean;
}) {
  try {
    const session = await requireAuth();
    const limit = options?.limit || 50;
    const unreadOnly = options?.unreadOnly || false;

    const where: NotificationWhereInput = {
      userId: session.user.id,
    };

    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        issue: {
          include: {
            feedback: {
              include: {
                project: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    });

    // Serialize dates to strings for client-side consumption
    const serializedNotifications = notifications.map((notification) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
      issue: notification.issue
        ? {
            ...notification.issue,
            feedback: {
              ...notification.issue.feedback,
              createdAt: notification.issue.feedback.createdAt.toISOString(),
              updatedAt: notification.issue.feedback.updatedAt.toISOString(),
            },
          }
        : null,
    }));

    return {
      success: true,
      notifications: serializedNotifications,
      unreadCount,
    };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return {
      success: false,
      error: "Internal server error",
      notifications: [],
      unreadCount: 0,
    };
  }
}

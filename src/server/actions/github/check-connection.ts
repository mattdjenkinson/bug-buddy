"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";

export async function checkGitHubConnection() {
  try {
    const session = await requireAuth();

    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: "github",
      },
    });

    return {
      success: true,
      connected: !!account?.accessToken,
    };
  } catch (error) {
    console.error("Error checking GitHub connection:", error);
    return {
      success: false,
      connected: false,
      error: "Failed to check GitHub connection",
    };
  }
}

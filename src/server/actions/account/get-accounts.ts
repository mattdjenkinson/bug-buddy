"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";

export async function getAccounts() {
  try {
    const session = await requireAuth();

    const accounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        providerId: true,
        accountId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      accounts,
    };
  } catch (error) {
    console.error("Error getting accounts:", error);
    return {
      success: false,
      error: "Failed to get accounts",
      accounts: [],
    };
  }
}

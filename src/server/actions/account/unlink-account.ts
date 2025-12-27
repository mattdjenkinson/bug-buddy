"use server";

import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const unlinkAccountSchema = z.object({
  accountId: z.string(),
});

export async function unlinkAccount(data: z.infer<typeof unlinkAccountSchema>) {
  try {
    const session = await requireAuth();
    const validated = unlinkAccountSchema.parse(data);

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: validated.accountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      return {
        success: false,
        error: "Account not found",
      };
    }

    // Check if this is the last account
    const accountCount = await prisma.account.count({
      where: {
        userId: session.user.id,
      },
    });

    if (accountCount <= 1) {
      return {
        success: false,
        error:
          "Cannot unlink the last account. Please link another account first or delete your account.",
      };
    }

    // Delete the account
    await prisma.account.delete({
      where: {
        id: validated.accountId,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format().fieldErrors,
      };
    }

    console.error("Error unlinking account:", error);
    return { success: false, error: "Internal server error" };
  }
}

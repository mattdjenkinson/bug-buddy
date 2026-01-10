import { serverEnv } from "@/env";
import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const installationId = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action"); // install | update | request

  if (!state || !installationId) {
    return NextResponse.redirect(
      new URL("/dashboard/new?tab=github&error=missing_parameters", url),
    );
  }

  // Verify state (CSRF protection)
  const verification = await prisma.verification.findFirst({
    where: {
      identifier: `github_app_install:${state}`,
      expiresAt: { gt: new Date() },
    },
  });

  if (!verification) {
    return NextResponse.redirect(
      new URL("/dashboard/new?tab=github&error=invalid_state", url),
    );
  }

  let parsed: { userId: string; projectId?: string; redirectUrl?: string };
  try {
    parsed = JSON.parse(verification.value) as {
      userId: string;
      projectId?: string;
      redirectUrl?: string;
    };
  } catch {
    parsed = { userId: "" };
  }

  try {
    // Ensure the user is logged in and matches the state payload.
    const session = await requireAuth();
    if (!parsed.userId || parsed.userId !== session.user.id) {
      return NextResponse.redirect(
        new URL("/dashboard/new?tab=github&error=invalid_state", url),
      );
    }

    // If this install was initiated from an existing project, persist it.
    if (parsed.projectId) {
      const integration = await prisma.gitHubIntegration.findUnique({
        where: { projectId: parsed.projectId },
      });
      if (!integration) {
        return NextResponse.redirect(
          new URL("/dashboard/new?tab=github&error=integration_not_found", url),
        );
      }

      await prisma.gitHubIntegration.update({
        where: { projectId: parsed.projectId },
        data: {
          installationId: String(installationId),
          appId: serverEnv.GITHUB_APP_ID || integration.appId,
        },
      });
    }

    // One-time use state.
    await prisma.verification.delete({ where: { id: verification.id } });

    const redirectUrl = parsed.redirectUrl || "/dashboard/new?tab=github";
    const redirectTo = new URL(redirectUrl, url);
    redirectTo.searchParams.set("github_app_installed", "true");
    // For create-project flow (no projectId), pass installation_id back to the UI.
    if (!parsed.projectId) {
      redirectTo.searchParams.set("installation_id", String(installationId));
    }
    if (setupAction) redirectTo.searchParams.set("setup_action", setupAction);

    return NextResponse.redirect(redirectTo);
  } catch (error) {
    console.error("GitHub App callback error:", error);

    // Cleanup state if possible; don't block on it.
    await prisma.verification
      .delete({ where: { id: verification.id } })
      .catch(() => undefined);

    const fallback = parsed.redirectUrl || "/dashboard/new?tab=github";
    const redirectTo = new URL(fallback, url);
    redirectTo.searchParams.set("error", "github_app_callback_failed");
    return NextResponse.redirect(redirectTo);
  }
}

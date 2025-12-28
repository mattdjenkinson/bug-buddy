import { SettingsForm } from "@/components/dashboard/settings-form";
import { getSession } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings | Bug Buddy",
  description:
    "Configure your project settings, GitHub integration, and widget customization",
};

export default async function SettingsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: {
      githubIntegration: true,
      widgetCustomization: true,
    },
  });

  return <SettingsForm projects={projects} />;
}

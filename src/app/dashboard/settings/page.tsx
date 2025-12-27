import { SettingsForm } from "@/components/dashboard/settings-form";
import { getSession } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

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

import { DashboardRedirector } from "@/components/dashboard/dashboard-redirector";
import { getSession } from "@/lib/auth/helpers";
import { getUserProjectsForSwitcher } from "@/server/services/projects.service";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard | Bug Buddy",
  description: "Overview of your bug reports, feedback, and project statistics",
};

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  const projects = await getUserProjectsForSwitcher(session.user.id);
  const fallbackSlug = projects[0]?.slug || null;
  const allowedSlugs = projects.map((p) => p.slug);

  return (
    <DashboardRedirector
      allowedSlugs={allowedSlugs}
      fallbackSlug={fallbackSlug}
      suffix=""
    />
  );
}

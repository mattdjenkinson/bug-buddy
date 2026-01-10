import { CreateProjectPageClient } from "@/components/dashboard/create-project-page-client";
import { getSession } from "@/lib/auth/helpers";
import { getInstallationRepositories } from "@/server/actions/github/app/installation-repositories";
import { getUserDefaultGitHubAppInstallationId } from "@/server/actions/github/app/user-installation";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Create project | Bug Buddy",
  description: "Create your first Bug Buddy project",
};

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ installation_id?: string }>;
}) {
  const session = await getSession();
  const sp = await searchParams;

  if (!session?.user) {
    redirect("/");
  }

  const installationIdFromUrl = sp.installation_id || "";
  const defaultInstallation = await getUserDefaultGitHubAppInstallationId();

  const installationId =
    installationIdFromUrl || defaultInstallation.installationId || "";

  const reposResult = installationId
    ? await getInstallationRepositories({ installationId })
    : null;

  return (
    <div className="max-w-2xl mx-auto bg-background rounded-lg p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Create a project</h1>
        <p className="text-muted-foreground">
          Create a project to start collecting feedback and configure your
          widget embed code.
        </p>
      </div>

      <CreateProjectPageClient
        initialInstallationId={installationId}
        repositories={reposResult?.success ? reposResult.repositories : []}
        repoError={
          reposResult && !reposResult.success ? reposResult.error : null
        }
      />
    </div>
  );
}

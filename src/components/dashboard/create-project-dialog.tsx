"use client";

import { CreateProjectPageClient } from "@/components/dashboard/create-project-page-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getInstallationRepositories } from "@/server/actions/github/app/installation-repositories";
import { getUserDefaultGitHubAppInstallationId } from "@/server/actions/github/app/user-installation";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

function buildUrlWithParams(pathname: string, searchParams: URLSearchParams) {
  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function CreateProjectDialog({
  trigger,
  title = "Create a project",
  autoOpenParam = "createProject",
  onProjectCreatedAction,
}: {
  trigger?: React.ReactElement;
  title?: string;
  autoOpenParam?: string;
  onProjectCreatedAction?: (project: {
    id: string;
    name: string;
    slug: string;
  }) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const shouldAutoOpen = searchParams.get(autoOpenParam) === "1";
  const [open, setOpen] = React.useState(shouldAutoOpen);

  // Keep dialog state in sync with URL so GitHub App install callback can reopen it.
  React.useEffect(() => {
    if (shouldAutoOpen) setOpen(true);
  }, [shouldAutoOpen]);

  const setOpenWithUrl = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      const next = new URLSearchParams(searchParams.toString());
      if (nextOpen) next.set(autoOpenParam, "1");
      else next.delete(autoOpenParam);
      router.replace(buildUrlWithParams(pathname, next));
    },
    [autoOpenParam, pathname, router, searchParams],
  );

  const defaultInstallationQuery = useQuery({
    queryKey: ["github-app-default-installation-id"],
    queryFn: async () => getUserDefaultGitHubAppInstallationId(),
    enabled: open,
    staleTime: 60_000,
  });

  const installationId = defaultInstallationQuery.data?.installationId || "";

  const reposQuery = useQuery({
    queryKey: ["github-app-installation-repositories", installationId],
    queryFn: async () => {
      if (!installationId)
        return { repositories: [], error: null as string | null };
      const res = await getInstallationRepositories({ installationId });
      if (!res.success) {
        return {
          repositories: [],
          error: res.error || "Failed to load repositories",
        };
      }
      return { repositories: res.repositories, error: null };
    },
    enabled: open,
    staleTime: 60_000,
  });

  const redirectUrlForInstall = React.useMemo(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.set(autoOpenParam, "1");
    return buildUrlWithParams(pathname, next);
  }, [autoOpenParam, pathname, searchParams]);

  return (
    <Dialog open={open} onOpenChange={setOpenWithUrl}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {defaultInstallationQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <CreateProjectPageClient
            initialInstallationId={installationId}
            repositories={reposQuery.data?.repositories || []}
            repoError={reposQuery.data?.error || null}
            installRedirectUrl={redirectUrlForInstall}
            onCancelAction={() => setOpenWithUrl(false)}
            onProjectCreatedAction={(project) => {
              onProjectCreatedAction?.(project);
              setOpenWithUrl(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

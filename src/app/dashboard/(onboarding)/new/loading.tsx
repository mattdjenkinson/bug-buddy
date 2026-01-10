import { Skeleton } from "@/components/ui/skeleton";

export default function NewProjectLoading() {
  return (
    <div className="max-w-2xl mx-auto bg-background rounded-lg p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Create a project</h1>
        <p className="text-muted-foreground">
          Create a project to start collecting feedback and configure your
          widget embed code.
        </p>
      </div>

      {/* Form skeleton (mirrors CreateProjectPageClient fields) */}
      <div className="space-y-4">
        {/* Project name + slug preview */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Repository select */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Allowed domains (add/remove list) */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="mt-2 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-10" />
              </div>
            ))}
            <div className="flex gap-2 items-center">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        </div>

        {/* Default labels */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>

        {/* Default assignees */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectFeedbackLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Feedback</h1>
        <p className="text-muted-foreground">
          View and manage feedback submissions
        </p>
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Skeleton className="h-10 w-full sm:w-[200px]" />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Skeleton className="h-10 w-full sm:w-[320px]" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-16 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-5/6" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

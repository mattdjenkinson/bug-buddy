import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function WidgetEmbedLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Screenshot skeleton */}
            <div>
              <div className="space-y-2 mb-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="w-full h-64 rounded-lg border" />
              </div>
            </div>

            {/* Form fields skeleton */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 justify-end">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    </div>
  );
}

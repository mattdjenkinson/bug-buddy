import { Badge } from "@/components/ui/badge";

/**
 * Status badge variant mapping
 */
const statusVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "default",
  "in-progress": "outline",
  closed: "secondary",
};

/**
 * Get a status badge component for feedback items
 */
export function getStatusBadge(status: string) {
  const variant = statusVariants[status.toLowerCase()] || "default";
  return <Badge variant={variant}>{status}</Badge>;
}

/**
 * Status badge variant mapping (exported for use in other components)
 */
export { statusVariants };

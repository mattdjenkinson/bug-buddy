"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-view-options";

interface Feedback {
  id: string;
  title: string | null;
  description: string;
  screenshot: string;
  status: string;
  userName: string | null;
  userEmail: string | null;
  url: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
  };
  issue: {
    id: string;
    githubIssueId: number;
    githubIssueUrl: string;
    state: string;
  } | null;
}

interface FeedbackListProps {
  projects: Array<{ id: string; name: string }>;
  initialFeedback: Feedback[];
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    open: "default",
    closed: "secondary",
    "in-progress": "outline",
  };
  return <Badge variant={variants[status] || "default"}>{status}</Badge>;
};

export function FeedbackList({ projects, initialFeedback }: FeedbackListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const feedback = initialFeedback;

  // Get filter values from URL params
  const selectedProject = searchParams.get("projectId") || "all";
  const selectedStatus = searchParams.get("status") || "all";
  const titleFilterFromUrl = searchParams.get("title") || "";

  // Get sorting from URL params
  const sortBy = searchParams.get("sortBy") || "";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  // Local state for title filter input (debounced)
  const [titleFilterInput, setTitleFilterInput] =
    React.useState(titleFilterFromUrl);

  // Sync local state with URL param when it changes externally
  React.useEffect(() => {
    setTitleFilterInput(titleFilterFromUrl);
  }, [titleFilterFromUrl]);

  const [sorting, setSorting] = React.useState<SortingState>(() => {
    if (sortBy) {
      return [{ id: sortBy, desc: sortOrder === "desc" }];
    }
    return [];
  });

  // Sync sorting state with URL params when they change externally
  // Use a ref to track the last synced values to prevent loops
  const lastSyncedSortRef = React.useRef({ sortBy: "", sortOrder: "" });

  React.useEffect(() => {
    const currentSortKey = `${sortBy || ""}-${sortOrder || "desc"}`;
    const lastSyncedKey = `${lastSyncedSortRef.current.sortBy}-${lastSyncedSortRef.current.sortOrder}`;

    // Only sync if URL params actually changed
    if (currentSortKey !== lastSyncedKey) {
      if (sortBy) {
        setSorting([{ id: sortBy, desc: sortOrder === "desc" }]);
      } else {
        setSorting([]);
      }
      lastSyncedSortRef.current = {
        sortBy: sortBy || "",
        sortOrder: sortOrder || "desc",
      };
    }
  }, [sortBy, sortOrder]);

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    () => {
      if (titleFilterFromUrl) {
        return [{ id: "title", value: titleFilterFromUrl }];
      }
      return [];
    },
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  // Update URL params when filters change
  // Use router.refresh() pattern to avoid dependency on searchParams
  const updateSearchParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const currentParams = new URLSearchParams(window.location.search);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          currentParams.delete(key);
        } else {
          currentParams.set(key, value);
        }
      });

      const newUrl = `/dashboard/feedback?${currentParams.toString()}`;
      router.push(newUrl);
    },
    [router],
  );

  const handleProjectChange = (value: string) => {
    updateSearchParams({ projectId: value === "all" ? null : value });
  };

  const handleStatusChange = (value: string) => {
    updateSearchParams({ status: value === "all" ? null : value });
  };

  // Handle sorting changes - only update URL if different from current URL params
  const lastSortStateRef = React.useRef<string>("");

  React.useEffect(() => {
    const currentSortKey =
      sorting.length > 0
        ? `${sorting[0].id}-${sorting[0].desc ? "desc" : "asc"}`
        : "";
    const urlSortKey = sortBy ? `${sortBy}-${sortOrder}` : "";

    // Only update URL if sorting state changed AND differs from URL
    if (
      currentSortKey !== lastSortStateRef.current &&
      currentSortKey !== urlSortKey
    ) {
      if (sorting.length > 0) {
        const sort = sorting[0];
        updateSearchParams({
          sortBy: sort.id,
          sortOrder: sort.desc ? "desc" : "asc",
        });
      } else {
        updateSearchParams({ sortBy: null, sortOrder: null });
      }
      lastSortStateRef.current = currentSortKey;
    }
  }, [sorting, updateSearchParams, sortBy, sortOrder]);

  // Debounce title filter changes
  React.useEffect(() => {
    // Only update if different from URL
    if (titleFilterInput === titleFilterFromUrl) {
      return;
    }

    const timer = setTimeout(() => {
      updateSearchParams({ title: titleFilterInput || null });
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [titleFilterInput, titleFilterFromUrl, updateSearchParams]);

  // Handle title filter input changes
  const handleTitleFilterChange = (value: string) => {
    setTitleFilterInput(value);
  };

  const columns: ColumnDef<Feedback>[] = React.useMemo(
    () => [
      {
        accessorKey: "screenshot",
        header: "Screenshot",
        cell: ({ row }) => {
          const screenshot = row.getValue("screenshot") as string;
          const isBase64 = screenshot.startsWith("data:");
          return (
            <div className="relative h-16 w-24 rounded border overflow-hidden">
              {isBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={screenshot}
                  alt="Screenshot"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={screenshot}
                  alt="Screenshot"
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Title" />
        ),
        cell: ({ row }) => {
          const title = row.getValue("title") as string | null;
          return <div className="font-medium">{title || "Untitled"}</div>;
        },
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Description" />
        ),
        cell: ({ row }) => {
          const description = row.getValue("description") as string;
          return (
            <div className="max-w-[300px] truncate text-sm text-muted-foreground">
              {description}
            </div>
          );
        },
      },
      {
        accessorKey: "project",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Project" />
        ),
        cell: ({ row }) => {
          const project = row.original.project;
          return <div className="text-sm">{project.name}</div>;
        },
        accessorFn: (row) => row.project.name,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return getStatusBadge(status);
        },
      },
      {
        accessorKey: "userName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="User" />
        ),
        cell: ({ row }) => {
          const userName = row.original.userName;
          const userEmail = row.original.userEmail;
          return (
            <div className="text-sm">
              {userName || userEmail || "Anonymous"}
              {userName && userEmail && (
                <div className="text-xs text-muted-foreground">{userEmail}</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => {
          const date = row.getValue("createdAt") as string;
          return (
            <div className="text-sm">{new Date(date).toLocaleDateString()}</div>
          );
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const feedback = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/dashboard/feedback/${feedback.id}`)
                  }
                >
                  View details
                </DropdownMenuItem>
                {feedback.issue && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(feedback.issue!.githubIssueUrl, "_blank");
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View GitHub Issue
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [router],
  );

  const table = useReactTable({
    data: feedback,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Disable client-side sorting and filtering since we do it server-side
    manualSorting: true,
    manualFiltering: true,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Select value={selectedProject} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <Input
            placeholder="Filter by title..."
            value={titleFilterInput}
            onChange={(event) => handleTitleFilterChange(event.target.value)}
            className="flex-1 sm:max-w-sm"
          />
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-full overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/dashboard/feedback/${row.original.id}`)
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        onClick={(e) => {
                          // Prevent navigation when clicking on actions
                          if (cell.column.id === "actions") {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No feedback found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}

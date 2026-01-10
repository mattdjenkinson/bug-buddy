"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
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
import { getStatusBadge } from "@/lib/badge-helpers";
import { DataTableColumnHeader } from "./data-table-column-header";
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
    slug: string;
  };
  issue: {
    id: string;
    githubIssueId: number;
    githubIssueUrl: string;
    state: string;
  } | null;
}

interface FeedbackListScopedProps {
  projectSlug: string;
  initialFeedback: Feedback[];
}

export function FeedbackListScoped({
  projectSlug,
  initialFeedback,
}: FeedbackListScopedProps) {
  const router = useRouter();
  const [limit, setLimit] = React.useState(10);
  const [offset, setOffset] = React.useState(0);
  const isInitialMount = React.useRef(true);

  // URL state management (status/title/sort only — project is implied by route)
  const [urlStatus, setUrlStatus] = useQueryState("status", {
    defaultValue: "all",
  });
  const [urlTitle, setUrlTitle] = useQueryState("title", {
    defaultValue: "",
  });
  const [urlSortBy, setUrlSortBy] = useQueryState("sortBy", {
    defaultValue: "",
  });
  const [urlSortOrder, setUrlSortOrder] = useQueryState("sortOrder", {
    defaultValue: "desc",
  });

  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setOffset(0);
    const timer = setTimeout(() => {
      router.refresh();
    }, 100);
    return () => clearTimeout(timer);
  }, [urlStatus, urlTitle, urlSortBy, urlSortOrder, router]);

  const paginatedFeedback = React.useMemo(() => {
    return initialFeedback.slice(offset, offset + limit);
  }, [initialFeedback, offset, limit]);

  const selectedStatus = urlStatus || "all";
  const titleFilterFromUrl = urlTitle || "";

  const sortBy = urlSortBy || "";
  const sortOrder = urlSortOrder || "desc";

  const [titleFilterInput, setTitleFilterInput] =
    React.useState(titleFilterFromUrl);

  React.useEffect(() => {
    setTitleFilterInput(titleFilterFromUrl);
  }, [titleFilterFromUrl]);

  const [sorting, setSorting] = React.useState<SortingState>(() => {
    if (sortBy) {
      return [{ id: sortBy, desc: sortOrder === "desc" }];
    }
    return [];
  });

  React.useEffect(() => {
    if (sortBy) {
      setSorting([{ id: sortBy, desc: sortOrder === "desc" }]);
    } else {
      setSorting([]);
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

  const handleStatusChange = (value: string) => {
    setUrlStatus(value === "all" ? null : value);
  };

  React.useEffect(() => {
    if (sorting.length > 0) {
      const sort = sorting[0];
      setUrlSortBy(sort.id);
      setUrlSortOrder(sort.desc ? "desc" : "asc");
    } else {
      setUrlSortBy(null);
      setUrlSortOrder(null);
    }
  }, [sorting, setUrlSortBy, setUrlSortOrder]);

  React.useEffect(() => {
    if (titleFilterInput === titleFilterFromUrl) {
      return;
    }

    const timer = setTimeout(() => {
      setUrlTitle(titleFilterInput || null);
    }, 500);

    return () => clearTimeout(timer);
  }, [titleFilterInput, titleFilterFromUrl, setUrlTitle]);

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
                    router.push(
                      `/dashboard/${projectSlug}/feedback/${feedback.id}`,
                    )
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
    [router, projectSlug],
  );

  const table = useReactTable({
    data: paginatedFeedback,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
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
            onChange={(event) => setTitleFilterInput(event.target.value)}
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
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
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
                      router.push(
                        `/dashboard/${projectSlug}/feedback/${row.original.id}`,
                      )
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        onClick={(e) => {
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
      {initialFeedback.length > 0 && (
        <DataPagination
          total={initialFeedback.length}
          limit={limit}
          offset={offset}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setOffset(0);
          }}
          onOffsetChange={setOffset}
        />
      )}
    </div>
  );
}

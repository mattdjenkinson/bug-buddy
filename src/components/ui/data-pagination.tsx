"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataPaginationProps {
  total: number;
  limit: number;
  offset: number;
  onLimitChange: (limit: number) => void;
  onOffsetChange: (offset: number) => void;
  limitOptions?: number[];
}

export function DataPagination({
  total,
  limit,
  offset,
  onLimitChange,
  onOffsetChange,
  limitOptions = [10, 20, 25, 30, 40, 50],
}: DataPaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const canPreviousPage = offset > 0;
  const canNextPage = offset + limit < total;

  const goToFirstPage = () => {
    onOffsetChange(0);
  };

  const goToPreviousPage = () => {
    onOffsetChange(Math.max(0, offset - limit));
  };

  const goToNextPage = () => {
    onOffsetChange(offset + limit);
  };

  const goToLastPage = () => {
    onOffsetChange((totalPages - 1) * limit);
  };

  return (
    <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-muted-foreground text-sm">{total} row(s) total.</div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="hidden text-sm font-medium sm:inline">Rows per page</p>
          <p className="text-sm font-medium sm:hidden">Rows</p>
          <Select
            value={`${limit}`}
            onValueChange={(value) => {
              onLimitChange(Number(value));
              // Reset to first page when changing page size
              onOffsetChange(0);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={limit} />
            </SelectTrigger>
            <SelectContent side="top">
              {limitOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full items-center justify-center text-sm font-medium sm:w-[100px]">
          Page {currentPage} of {totalPages || 1}
        </div>
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 lg:flex"
            onClick={goToFirstPage}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={goToPreviousPage}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={goToNextPage}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 lg:flex"
            onClick={goToLastPage}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

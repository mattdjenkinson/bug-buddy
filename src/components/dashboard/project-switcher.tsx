"use client";

import { ChevronsUpDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreateProjectDialog } from "./create-project-dialog";
import { useProject } from "./project-context";

export function ProjectSwitcher({ className }: { className?: string }) {
  const { projects, currentProject, setCurrentProjectSlug, upsertProject } =
    useProject();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (projects.length === 0) {
    return (
      <Button asChild variant="outline" className={cn("h-9", className)}>
        <Link href="/dashboard/new">
          <Plus className="size-4" />
          Create project
        </Link>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-2 justify-between min-w-[220px] active:scale-100",
              className,
            )}
          >
            <span className="truncate">
              {currentProject?.name || "Select project"}
            </span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[260px]">
          <DropdownMenuLabel>Projects</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {projects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => setCurrentProjectSlug(p.slug)}
            >
              <span className="truncate">{p.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              // Keep the dialog mounted; we open it via URL param.
              // Prevent Radix from treating this as a "selection" action.
              e.preventDefault();
              const next = new URLSearchParams(searchParams.toString());
              next.set("createProject", "1");
              const qs = next.toString();
              router.replace(qs ? `${pathname}?${qs}` : pathname);
            }}
          >
            <Plus className="size-4" />
            Create project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Must live OUTSIDE the dropdown so it doesn't unmount on close */}
      <CreateProjectDialog
        onProjectCreatedAction={(p) => {
          upsertProject(p);
        }}
      />
    </>
  );
}

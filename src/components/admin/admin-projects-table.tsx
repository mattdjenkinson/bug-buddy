"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DataPagination } from "@/components/ui/data-pagination";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAllProjects } from "@/server/actions/admin.actions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type Project = {
  id: string;
  name: string;
  apiKey: string;
  description: string | null;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  _count: {
    feedback: number;
  };
};

type ProjectsResponse = {
  projects: Project[];
  total: number;
};

export function AdminProjectsTable() {
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [searchValue, setSearchValue] = useState("");

  const {
    data: projectsData,
    isLoading,
    error,
  } = useQuery<ProjectsResponse>({
    queryKey: ["admin-projects", limit, offset, searchValue],
    queryFn: () => getAllProjects({ limit, offset, search: searchValue }),
  });

  const projects = projectsData?.projects || [];
  const total = projectsData?.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search projects by name..."
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setOffset(0);
            }}
            className="w-[300px]"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Total: {total} projects
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Feedback</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-destructive"
                >
                  Error: {error.message}
                </TableCell>
              </TableRow>
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No projects found
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{project.name}</div>
                      {project.description && (
                        <div className="text-sm text-muted-foreground">
                          {project.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={project.user.image || undefined} />
                        <AvatarFallback>
                          {project.user.name?.[0]?.toUpperCase() ||
                            project.user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {project.user.name || "No name"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {project.user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <code className="text-xs bg-muted px-2 py-1 rounded block max-w-[200px] truncate">
                          {project.apiKey}
                        </code>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono text-xs">{project.apiKey}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {project._count.feedback} feedback
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <DataPagination
          total={total}
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

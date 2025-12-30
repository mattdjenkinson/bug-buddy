"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminProjectsTable } from "./admin-projects-table";
import { AdminUsersTable } from "./admin-users-table";

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users and projects across the platform
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="space-y-4">
          <AdminUsersTable />
        </TabsContent>
        <TabsContent value="projects" className="space-y-4">
          <AdminProjectsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

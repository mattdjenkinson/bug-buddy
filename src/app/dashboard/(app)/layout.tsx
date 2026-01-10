import { AppSidebar } from "@/components/app-sidebar";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { ProjectProvider } from "@/components/dashboard/project-context";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";
import { HexagonIconNegative } from "@/components/icon";
import { NavUser } from "@/components/nav-user";
import { NotificationsBell } from "@/components/notifications-bell";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth/helpers";
import { getUserProjectsForSwitcher } from "@/server/services/projects.service";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/");
  }

  const projects = await getUserProjectsForSwitcher(session.user.id);
  if (projects.length === 0) {
    redirect("/dashboard/new");
  }

  return (
    <SidebarProvider>
      <ProjectProvider projects={projects}>
        <AppSidebar />
        <SidebarInset>
          <header
            className="flex h-16 shrink-0 items-center gap-2 sticky top-0 z-10 bg-background w-full"
            suppressHydrationWarning
          >
            <div className="flex items-center gap-2 px-4 w-full">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4 hidden md:block"
              />

              <div className="hidden md:flex items-center gap-2 w-full">
                <ProjectSwitcher />
                <Separator
                  orientation="vertical"
                  className="data-[orientation=vertical]:h-4"
                />
                <DashboardBreadcrumb />
              </div>

              <HexagonIconNegative className="w-5 h-5 md:hidden" />

              <div className="ml-auto flex items-center gap-2">
                <NotificationsBell />

                <NavUser small className="self-end md:hidden" />
              </div>
            </div>
          </header>
          <main
            className="flex flex-1 flex-col gap-4 p-4 pt-0 md:min-h-0 md:overflow-y-auto"
            suppressHydrationWarning
          >
            {children}
          </main>
        </SidebarInset>
      </ProjectProvider>
    </SidebarProvider>
  );
}

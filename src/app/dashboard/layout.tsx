import { AppSidebar } from "@/components/app-sidebar";
import { SessionProvider } from "@/components/auth/session-provider";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { NavUser } from "@/components/nav-user";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 sticky top-0 z-10 bg-background w-full">
            <div className="flex items-center gap-2 px-4 w-full">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4 hidden md:block"
              />

              <DashboardBreadcrumb />
              <NavUser small className="self-end md:hidden" />
            </div>
          </header>
          <main
            className="flex flex-1 flex-col gap-4 p-4 pt-0 md:min-h-0 md:overflow-y-auto"
            suppressHydrationWarning
          >
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}

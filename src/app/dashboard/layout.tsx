import { AppSidebar } from "@/components/app-sidebar";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { PostHogProvider } from "@/components/posthog-provider";
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
    <PostHogProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 sticky top-0 z-10 bg-background">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <DashboardBreadcrumb />
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
    </PostHogProvider>
  );
}

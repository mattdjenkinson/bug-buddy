"use client";

import {
  BarChart3,
  Folder,
  LayoutDashboard,
  MessageSquare,
  Settings2,
  Shield,
} from "lucide-react";
import * as React from "react";

import { useSession } from "@/components/auth/session-provider";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { HexagonIconNegative } from "./icon";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Feedback",
      url: "/dashboard/feedback",
      icon: MessageSquare,
    },
    {
      title: "Projects",
      url: "/dashboard/projects",
      icon: Folder,
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: BarChart3,
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings2,
    },
    ...(isAdmin
      ? [
          {
            title: "Admin",
            url: "/dashboard/admin",
            icon: Shield,
          },
        ]
      : []),
  ];
  return (
    <Sidebar variant="inset" {...props} suppressHydrationWarning>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <HexagonIconNegative className="w-6 h-6" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Bug Buddy</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

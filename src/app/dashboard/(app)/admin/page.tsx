import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getSession } from "@/lib/auth/helpers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin | Bug Buddy",
  description: "Admin dashboard for managing users and projects",
};

export default async function AdminPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  // Check if user has admin role
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminDashboard />;
}

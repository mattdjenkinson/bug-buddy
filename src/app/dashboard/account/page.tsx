import { getSession } from "@/lib/auth/helpers";
import { redirect } from "next/navigation";
import { AccountSettingsClient } from "./account-settings-client";

export default async function AccountPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  return <AccountSettingsClient user={session.user} />;
}

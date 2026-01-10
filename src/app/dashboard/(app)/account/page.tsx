import type { Metadata } from "next";
import { AccountSettingsClient } from "./account-settings-client";

export const metadata: Metadata = {
  title: "Account | Bug Buddy",
  description: "Manage your account settings and linked accounts",
};

export default async function AccountPage() {
  return <AccountSettingsClient />;
}

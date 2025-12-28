import { SignInCard } from "@/components/auth/sign-in-card";
import { getSession } from "@/lib/auth/helpers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign In | Bug Buddy",
  description: "Sign in to Bug Buddy to manage your bug reports and feedback",
};

export default async function Home() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <SignInCard />
    </div>
  );
}

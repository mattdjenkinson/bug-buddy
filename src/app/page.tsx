import { SignInCard } from "@/components/auth/sign-in-card";
import { getSession } from "@/lib/auth/helpers";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignInCard />
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/");

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold">Dashboard</h1>

        <p className="mt-2 text-neutral-600">
          Signed in as {data.user.email}
        </p>

        <div className="mt-8 rounded border p-4">
          <h2 className="text-lg font-medium">Your projects</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Coming next: create + list projects
          </p>
        </div>

        <a className="mt-8 inline-block rounded border px-3 py-2" href="/">
          Back to home
        </a>
      </div>
    </main>
  );
}

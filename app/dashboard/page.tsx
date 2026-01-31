"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {

  // 1️⃣ STATE (goes here)
  const [email, setEmail] = useState<string>("");

  // 2️⃣ EFFECTS (go here)
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? "");
    };

    load();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user?.email ?? "");
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 3️⃣ ACTIONS (go here)
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // 4️⃣ RETURN (UI goes here)
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold">Dashboard</h1>

        <p className="mt-2 text-neutral-600">
          {email ? `Signed in as ${email}` : "Loading session..."}
        </p>

        <div className="mt-8 rounded border p-4">
          <h2 className="text-lg font-medium">Your projects</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Coming next: create + list projects
          </p>
        </div>

        <button
          className="mt-8 rounded border px-3 py-2"
          onClick={signOut}
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

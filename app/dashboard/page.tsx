"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-neutral-600">Loading session…</p>
      </main>
    );
  }

  // IMPORTANT: no redirect here. Just show a link back.
  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-neutral-600">You’re not signed in.</p>
        <a className="mt-6 rounded border px-4 py-2" href="/">
          Go to sign in
        </a>
      </main>
    );
  }

  // Signed in dashboard
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-neutral-600">
        Signed in as {session.user?.email}
      </p>

      <div className="mt-8 w-full max-w-xl rounded border p-6">
        <p className="font-medium">Your projects</p>
        <p className="text-sm text-neutral-600">Coming next: create + list projects</p>
      </div>

      <button className="mt-8 rounded border px-4 py-2" onClick={signOut}>
        Sign out
      </button>
    </main>
  );
}

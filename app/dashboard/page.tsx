"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [session, setSession] = useState<any>(null);
  const [message, setMessage] = useState("");

  // 1) Load session once + subscribe to auth changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data.session);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = async () => {
    setMessage("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setMessage(error.message);
    setMessage("Account created. Check your email (if required), then sign in.");
  };

  const signIn = async () => {
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMessage(error.message);
    // session listener will update automatically
  };

  const signOut = async () => {
    setMessage("");
    await supabase.auth.signOut();
  };

  // If NOT signed in: show login form
  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="text-4xl font-semibold">Zenavant</h1>
        <p className="mt-3 text-neutral-600">Turn ideas into something new.</p>
        <div className="mt-4 text-xs uppercase tracking-widest text-neutral-500">
          Coming soon
        </div>

        <div className="mt-8 w-full max-w-sm space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex gap-2">
            <button
              className="flex-1 rounded bg-black px-3 py-2 text-white"
              onClick={signUp}
            >
              Sign up
            </button>
            <button
              className="flex-1 rounded border px-3 py-2"
              onClick={signIn}
            >
              Sign in
            </button>
          </div>

          {message ? (
            <p className="text-sm text-neutral-600">{message}</p>
          ) : null}
        </div>
      </main>
    );
  }

  // If signed in: show signed-in state (you’ll redirect anyway)
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <p className="text-sm text-neutral-600">
        Signed in as {session?.user?.email}
      </p>

      <div className="mt-6 flex gap-2">
        <a href="/dashboard" className="rounded border px-4 py-2">
          Go to dashboard
        </a>

        <button className="rounded border px-4 py-2" onClick={signOut}>
          Sign out
        </button>
      </div>
    </main>
  );
}

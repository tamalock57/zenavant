"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  // 1) Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 2) Auth session state
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");

  // 3) Auth actions
  const signUp = async () => {
    setMessage("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }
    // Some Supabase setups require email confirmation
    setMessage(
      data?.user?.identities?.length
        ? "Account created. You can sign in now."
        : "Check your email to confirm your account, then sign in."
    );
  };

  const signIn = async () => {
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Signed in!");
  };

  const signOut = async () => {
    setMessage("");
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(error.message);
  };

  // 4) Keep session in sync (runs once)
  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session);
      setLoading(false);
    };

    boot();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // 5) Optional: auto-redirect to dashboard when signed in
  useEffect(() => {
    if (session) {
      window.location.href = "/dashboard";
    }
  }, [session]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-semibold">Zenavant</h1>

      <p className="mt-3 text-neutral-600">Turn ideas into something new.</p>
      <div className="mt-4 text-xs uppercase tracking-widest text-neutral-500">
        Coming soon
      </div>

      {loading ? (
        <div className="mt-10 text-sm text-neutral-500">Loading…</div>
      ) : !session ? (
        <div className="mt-8 w-full max-w-sm space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <div className="flex gap-2">
            <button
              className="flex-1 rounded bg-black px-3 py-2 text-white"
              onClick={signUp}
              type="button"
            >
              Sign up
            </button>

            <button
              className="flex-1 rounded border px-3 py-2"
              onClick={signIn}
              type="button"
            >
              Sign in
            </button>
          </div>

          {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-sm text-neutral-600">
            Signed in as {session.user.email}
          </p>

          <a href="/dashboard" className="rounded border px-4 py-2">
            Go to dashboard
          </a>

          <button className="rounded border px-3 py-2" onClick={signOut} type="button">
            Sign out
          </button>

          {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
        </div>
      )}
    </main>
  );
}

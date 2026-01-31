"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  // 1) Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 2) Auth session state
  const [session, setSession] = useState<any>(null);

  // 3) Auth actions
  const signUp = async () => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    console.log("SignUp:", data);
    console.log("SignUp error:", error);
  };

  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log("SignIn:", data);
    console.log("SignIn error:", error);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    console.log("SignOut error:", error);
  };

  // 4) Keep session in sync (runs once on page load)
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      console.log("Session:", data.session);
    };

    run();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        console.log("Auth change:", session);
      }
    );

    // Cleanup (VERY important)
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 5) UI (this is where your big return goes)
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-semibold">Zenavant</h1>

      <p className="mt-3 text-neutral-600">Turn ideas into something new.</p>

      <div className="mt-4 text-xs uppercase tracking-widest text-neutral-500">
        Coming soon
      </div>

      {!session ? (
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
        </div>
      ) : (
        <div className="mt-8">
          <p className="mb-3 text-sm text-neutral-600">
            Signed in as {session.user.email}
          </p>

          <button className="rounded border px-3 py-2" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSignIn() {
    const email = prompt("Enter email:");
    const password = prompt("Enter password:");

    if (!email || !password) return;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) alert(error.message);
  }

  async function handleSignUp() {
    const email = prompt("Enter email:");
    const password = prompt("Enter password:");

    if (!email || !password) return;

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) alert(error.message);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) return <p style={{ padding: 20 }}>Loading...</p>;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f7f8",
        padding: 20,
        fontFamily: "system-ui",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        {/* HERO */}
        <div
          style={{
            marginBottom: 24,
            padding: 20,
            borderRadius: 20,
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <h1>Zenavant</h1>
          <p style={{ opacity: 0.7 }}>
            Turn ideas into something real.
          </p>

          {/* AUTH AREA */}
          {!session ? (
            <div style={{ marginTop: 12 }}>
              <button onClick={handleSignIn}>Sign in</button>
              <button onClick={handleSignUp} style={{ marginLeft: 10 }}>
                Sign up
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <button onClick={handleSignOut}>Sign out</button>
            </div>
          )}
        </div>

        {/* ONLY SHOW IF SIGNED IN */}
        {session && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            <div
              onClick={() =>
                router.push("/tools/turn-thought-into-plan")
              }
              style={{ padding: 16, background: "#fff", borderRadius: 12 }}
            >
              Turn Thought Into Plan
            </div>

            <div
              onClick={() => router.push("/tools/image-maker")}
              style={{ padding: 16, background: "#fff", borderRadius: 12 }}
            >
              Image Maker
            </div>

            <div
              onClick={() => router.push("/tools/video-maker")}
              style={{ padding: 16, background: "#fff", borderRadius: 12 }}
            >
              Video Maker
            </div>

            <div
              onClick={() => router.push("/tools/library")}
              style={{ padding: 16, background: "#fff", borderRadius: 12 }}
            >
              Library
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
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

  if (loading) {
    return (
      <main style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
        Loading...
      </main>
    );
  }

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: 16,
    background: "#fff",
    boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
    cursor: "pointer",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
    fontSize: 14,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f7f8",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 24,
            padding: 20,
            borderRadius: 20,
            background: "linear-gradient(180deg, #ffffff 0%, #f4f6fb 100%)",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              letterSpacing: 1,
              textTransform: "uppercase",
              opacity: 0.5,
            }}
          >
            Zenavant
          </p>

          <h1
            style={{
              marginTop: 8,
              marginBottom: 10,
              fontSize: 34,
              lineHeight: 1.05,
            }}
          >
            Turn ideas into something real.
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 620,
              opacity: 0.72,
              lineHeight: 1.5,
              fontSize: 15,
            }}
          >
            Build a plan, create images and videos, and keep everything in one
            place.
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 16,
              flexWrap: "wrap",
            }}
          >
            {!session ? (
              <>
                <button onClick={handleSignIn} style={buttonStyle}>
                  Sign in
                </button>
                <button onClick={handleSignUp} style={secondaryButtonStyle}>
                  Sign up
                </button>
              </>
            ) : (
              <button onClick={handleSignOut} style={secondaryButtonStyle}>
                Sign out
              </button>
            )}
          </div>
        </div>

        {session && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 14,
              }}
            >
              <div
                style={cardStyle}
                onClick={() => router.push("/tools/turn-thought-into-plan")}
              >
                <h2 style={{ margin: 0, fontSize: 18 }}>Turn Thought Into Plan</h2>
                <p style={{ marginTop: 8, marginBottom: 0, opacity: 0.72, fontSize: 14, lineHeight: 1.45 }}>
                  Start with one thought and turn it into a calm, actionable plan.
                </p>
              </div>

              <div
                style={cardStyle}
                onClick={() => router.push("/tools/image-maker")}
              >
                <h2 style={{ margin: 0, fontSize: 18 }}>Image Maker</h2>
                <p style={{ marginTop: 8, marginBottom: 0, opacity: 0.72, fontSize: 14, lineHeight: 1.45 }}>
                  Create a still image from a prompt or from a saved plan.
                </p>
              </div>

              <div
                style={cardStyle}
                onClick={() => router.push("/tools/video-maker")}
              >
                <h2 style={{ margin: 0, fontSize: 18 }}>Video Maker</h2>
                <p style={{ marginTop: 8, marginBottom: 0, opacity: 0.72, fontSize: 14, lineHeight: 1.45 }}>
                  Generate short videos from your ideas with a cleaner workflow.
                </p>
              </div>

              <div
                style={cardStyle}
                onClick={() => router.push("/tools/library")}
              >
                <h2 style={{ margin: 0, fontSize: 18 }}>Library</h2>
                <p style={{ marginTop: 8, marginBottom: 0, opacity: 0.72, fontSize: 14, lineHeight: 1.45 }}>
                  View, reuse, download, and delete your saved creations and plans.
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 16,
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Suggested flow</h3>
              <p style={{ margin: 0, opacity: 0.72, lineHeight: 1.5, fontSize: 14 }}>
                Start with <strong>Turn Thought Into Plan</strong>, then send the
                result to <strong>Image Maker</strong> or <strong>Video Maker</strong>.
                Check everything later in <strong>Library</strong>.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
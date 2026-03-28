"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: 16,
    background: "#fff",
    boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
    cursor: "pointer",
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
  };

  const textStyle: React.CSSProperties = {
    marginTop: 8,
    marginBottom: 0,
    opacity: 0.72,
    lineHeight: 1.45,
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
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
        }}
      >
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
        </div>

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
            <h2 style={titleStyle}>Turn Thought Into Plan</h2>
            <p style={textStyle}>
              Start with one thought and turn it into a calm, actionable plan.
            </p>
          </div>

          <div
            style={cardStyle}
            onClick={() => router.push("/tools/image-maker")}
          >
            <h2 style={titleStyle}>Image Maker</h2>
            <p style={textStyle}>
              Create a still image from a prompt or from a saved plan.
            </p>
          </div>

          <div
            style={cardStyle}
            onClick={() => router.push("/tools/video-maker")}
          >
            <h2 style={titleStyle}>Video Maker</h2>
            <p style={textStyle}>
              Generate short videos from your ideas with a cleaner workflow.
            </p>
          </div>

          <div
            style={cardStyle}
            onClick={() => router.push("/tools/library")}
          >
            <h2 style={titleStyle}>Library</h2>
            <p style={textStyle}>
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
            result to <strong>Image Maker</strong> or{" "}
            <strong>Video Maker</strong>. Check everything later in{" "}
            <strong>Library</strong>.
          </p>
        </div>
      </div>
    </main>
  );
}
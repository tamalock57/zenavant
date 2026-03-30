"use client";

import { useEffect, useRef, useState } from "react";

export default function Page() {
  const handled = useRef(false);

  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    if (status === "completed" || status === "failed") return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/image-to-video?id=${encodeURIComponent(jobId)}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || "Failed to refresh status");
          setLoading(false);
          return;
        }

        setStatus(data.status);

        if (data.status === "completed" && !handled.current) {
          handled.current = true;
          setVideoUrl(data.downloadUrl || null);
          setLoading(false);
        }

        if (data.status === "failed") {
          setError(data?.error || "Video generation failed");
          setLoading(false);
        }
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
        setLoading(false);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [jobId, status]);

  async function generate() {
    handled.current = false;
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setJobId(null);
    setStatus(null);

    try {
      const fd = new FormData();

      if (file) fd.append("file", file);
      fd.append("prompt", prompt);

      const res = await fetch("/api/image-to-video", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Video generation failed");
        setLoading(false);
        return;
      }

      setJobId(data.id);
      setStatus(data.status);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 700, margin: "auto", padding: 24 }}>
      <h1 style={{ fontSize: 34, fontWeight: 750, marginBottom: 6 }}>
        Image → Video
      </h1>

      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Upload an image and generate motion from your prompt.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <div>
          <label style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>
            Upload Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>
            Describe Motion
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe motion..."
            rows={4}
            style={{
              width: "100%",
              padding: 12,
              fontSize: 16,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          onClick={generate}
          disabled={loading}
          style={{
            marginTop: 12,
            padding: "10px 14px",
            fontSize: 16,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.2)",
            background: loading ? "rgba(0,0,0,0.08)" : "#111",
            color: loading ? "#444" : "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Generating..." : "Generate Video"}
        </button>

        <div style={{ marginTop: 16, fontSize: 16 }}>
          <div>
            <b>Status:</b> {status ?? "—"}
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(220,38,38,0.25)",
              background: "rgba(254,242,242,1)",
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {videoUrl && (
        <section
          style={{
            marginTop: 18,
            padding: 16,
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            background: "#fff",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 750, marginTop: 0 }}>
            Result
          </h2>

          <video
            controls
            src={videoUrl}
            style={{
              width: "100%",
              borderRadius: 10,
              marginTop: 10,
            }}
          />
        </section>
      )}
    </main>
  );
}
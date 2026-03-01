"use client";

import { useEffect, useRef, useState } from "react";

type JobStatus = "queued" | "in_progress" | "completed" | "failed";

export default function VideoMakerPage() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1280x720");
  const [seconds, setSeconds] = useState("8");

  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const canSubmit = prompt.trim().length >= 5;
  const pollTimer = useRef<number | null>(null);

  function stopPolling() {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function poll(id: string) {
    try {
      const res = await fetch(`/api/video-maker?id=${encodeURIComponent(id)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Status check failed");
        stopPolling();
        setLoading(false);
        return;
      }

      setStatus(data.status);
      setProgress(typeof data.progress === "number" ? data.progress : 0);

      if (data.status === "completed") {
        setVideoUrl(data.downloadUrl);
        stopPolling();
        setLoading(false);
        setPrompt("");
      }

      if (data.status === "failed") {
        setError(data.error || "Video failed");
        stopPolling();
        setLoading(false);
      }
    } catch (e: any) {
      setError(e?.message ?? "Polling failed");
      stopPolling();
      setLoading(false);
    }
  }

  async function generate() {
    if (!canSubmit) return;

    stopPolling();
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setJobId(null);
    setStatus(null);
    setProgress(0);

    try {
      const res = await fetch("/api/video-maker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size, seconds }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Request failed");
        setLoading(false);
        return;
      }

      setJobId(data.id);
      setStatus(data.status);
      setProgress(typeof data.progress === "number" ? data.progress : 0);

      pollTimer.current = window.setInterval(() => poll(data.id), 2000) as unknown as number;
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  useEffect(() => () => stopPolling(), []);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 34, fontWeight: 750, marginBottom: 6 }}>Video Maker</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>Describe a short video. Zenavant generates it.</p>

      <div style={{ marginTop: 16, padding: 16, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, background: "rgba(255,255,255,0.9)" }}>
        <label style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>Prompt</label>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: A calm cinematic shot of a desk by a window. Slow camera push-in."
          rows={4}
          style={{ width: "100%", padding: 12, fontSize: 16, borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)", outline: "none", background: "#fff", color: "#111" }}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 14, opacity: 0.85 }}>Size</label>
          <select value={size} onChange={(e) => setSize(e.target.value)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)", background: "#fff" }}>
            <option value="1280x720">1280×720 (landscape)</option>
            <option value="720x1280">720×1280 (portrait)</option>
            <option value="1792x1024">1792×1024 (wide HD)</option>
            <option value="1024x1792">1024×1792 (tall HD)</option>
          </select>

          <label style={{ fontSize: 14, opacity: 0.85 }}>Seconds</label>
          <select value={seconds} onChange={(e) => setSeconds(e.target.value)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)", background: "#fff" }}>
            <option value="4">4</option>
            <option value="8">8</option>
            <option value="12">12</option>
          </select>

          <button
            onClick={generate}
            disabled={loading || !canSubmit}
            style={{
              marginLeft: "auto",
              padding: "10px 14px",
              fontSize: 16,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: loading || !canSubmit ? "rgba(0,0,0,0.08)" : "#111",
              color: loading || !canSubmit ? "#444" : "#fff",
              cursor: loading || !canSubmit ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate video"}
          </button>
        </div>

        {(jobId || status) && (
          <div style={{ marginTop: 12, fontSize: 14, opacity: 0.85 }}>
            <div><b>Status:</b> {status ?? "—"}</div>
            <div><b>Progress:</b> {progress}%</div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid rgba(220, 38, 38, 0.35)", background: "rgba(220, 38, 38, 0.06)", color: "#7f1d1d" }}>
            {error}
          </div>
        )}
      </div>

      {videoUrl && (
        <section style={{ marginTop: 18, padding: 16, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, background: "rgba(255,255,255,0.9)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 750, marginTop: 0 }}>Result</h2>
          <video controls src={videoUrl} style={{ marginTop: 10, width: "100%", height: "auto", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }} />
          <div style={{ marginTop: 10 }}>
            <a href={videoUrl} download style={{ fontSize: 14 }}>Download video</a>
          </div>
        </section>
      )}
    </main>
  );
}
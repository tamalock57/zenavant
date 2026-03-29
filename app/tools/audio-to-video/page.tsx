"use client";

import { useEffect, useRef, useState } from "react";

type VideoStatus = "queued" | "in_progress" | "completed" | "failed" | string;

export default function AudioToVideoPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pollTimer = useRef<number | null>(null);
  const hasHandledComplete = useRef(false);

  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState("8");
  const [size, setSize] = useState("1280x720");

  const [loading, setLoading] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [status, setStatus] = useState<VideoStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function stopPolling() {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  useEffect(() => {
    if (!videoId) return;
    if (status === "completed" || status === "failed") return;

    pollTimer.current = window.setInterval(() => {
      refreshStatus(true);
    }, 3000);

    return () => stopPolling();
  }, [videoId, status]);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  async function startJob() {
    setError(null);
    setLoading(true);
    setVideoUrl(null);
    setVideoId(null);
    setStatus(null);
    hasHandledComplete.current = false;
    stopPolling();

    try {
      const fd = new FormData();
      const audioFile = fileRef.current?.files?.[0] ?? null;

      if (audioFile) fd.append("audio", audioFile);
      fd.append("prompt", prompt);
      fd.append("seconds", seconds);
      fd.append("size", size);

      const res = await fetch("/api/audio-to-video", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to start video job");
      }

      setVideoId(data.id);
      setStatus(data.status ?? "queued");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  async function refreshStatus(fromAutoPoll = false) {
    if (!videoId) {
      setError("Missing video id");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/audio-to-video?id=${encodeURIComponent(videoId)}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok) {
        if (!hasHandledComplete.current) {
          throw new Error(data?.error ?? "Failed to fetch status");
        }
        return;
      }

      setStatus(data.status ?? null);

      if (data.status === "completed") {
        if (!hasHandledComplete.current) {
          hasHandledComplete.current = true;
          setVideoUrl(
            data.downloadUrl ||
              `/api/audio-to-video?id=${encodeURIComponent(videoId)}&content=1`
          );
        }

        stopPolling();
        setLoading(false);
        return;
      }

      if (data.status === "failed") {
        setError(data?.error ?? "Video failed");
        stopPolling();
        setLoading(false);
        return;
      }

      if (!fromAutoPoll) {
        setError(null);
      }
    } catch (e: any) {
      if (!hasHandledComplete.current) {
        setError(e?.message ?? "Something went wrong");
      }
      stopPolling();
      setLoading(false);
    }
  }

  const buttonStyle: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.16)",
    borderRadius: 10,
    padding: "10px 14px",
    background: "#fff",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "#111",
    color: "#fff",
    border: "1px solid rgba(0,0,0,0.2)",
  };

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 34, fontWeight: 750, marginBottom: 6 }}>
        Audio → Video
      </h1>

      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Upload audio and generate a visual story around it.
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
            Upload Audio
          </label>
          <input ref={fileRef} type="file" accept="audio/*" />
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>
            Describe Video
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Example: A calm, realistic presenter speaking to camera in a softly lit studio."
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

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 14,
            alignItems: "center",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 14, opacity: 0.85, marginBottom: 6 }}>
              Video Length
            </label>
            <select
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.18)",
                background: "#fff",
              }}
            >
              <option value="4">4 seconds</option>
              <option value="8">8 seconds</option>
              <option value="12">12 seconds</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 14, opacity: 0.85, marginBottom: 6 }}>
              Size
            </label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.18)",
                background: "#fff",
              }}
            >
              <option value="1280x720">1280x720 (Landscape)</option>
              <option value="720x1280">720x1280 (Portrait)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 10, marginLeft: "auto", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={startJob}
              disabled={loading}
              style={{
                ...(loading ? buttonStyle : primaryButtonStyle),
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Working..." : "Generate Video"}
            </button>

            <button
              type="button"
              onClick={() => refreshStatus(false)}
              disabled={loading || !videoId || status === "completed" || status === "failed"}
              style={{
                ...buttonStyle,
                cursor:
                  loading || !videoId || status === "completed" || status === "failed"
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  loading || !videoId || status === "completed" || status === "failed"
                    ? 0.6
                    : 1,
              }}
            >
              Refresh Status
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#fafafa",
          }}
        >
          <div><b>Video ID:</b> {videoId ?? "—"}</div>
          <div><b>Status:</b> {status ?? "—"}</div>
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
          <h2 style={{ fontSize: 18, fontWeight: 750, marginTop: 0 }}>Result</h2>
          <video
            controls
            className="w-full rounded border"
            src={videoUrl}
            style={{ width: "100%", borderRadius: 10, marginTop: 10 }}
          />
          <div style={{ marginTop: 10 }}>
            <a href={videoUrl} download style={{ fontSize: 14 }}>
              Download video
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
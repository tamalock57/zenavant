"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type JobStatus = "queued" | "in_progress" | "completed" | "failed";

export default function VideoMakerPage() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1280x720");
  const [seconds, setSeconds] = useState("8");

  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<number | null>(null);
  const hasHandledComplete = useRef(false);

  const canSubmit = prompt.trim().length >= 5;

  // Protect page
  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
      }
    }

    checkUser();
  }, [router]);

  // Restore prompt passed from another page
  useEffect(() => {
    const saved = localStorage.getItem("zenavant_prompt");
    if (saved) {
      setPrompt(saved);
      localStorage.removeItem("zenavant_prompt");
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  function stopPolling() {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  // keep the rest of your existing Video Maker code below this line

  async function poll(id: string) {
    try {
      const res = await fetch(`/api/video-maker?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        if (!hasHandledComplete.current) {
          setError(data?.error || "Status check failed");
        }
        stopPolling();
        setLoading(false);
        return;
      }

      setStatus(data.status);
      setProgress(typeof data.progress === "number" ? data.progress : 0);

      if (data.status === "completed") {
        if (!hasHandledComplete.current) {
          hasHandledComplete.current = true;
          setVideoUrl(data.downloadUrl || null);
          setStatus("completed");
          setProgress(100);
          setLoading(false);
          setPrompt("");
        }

        stopPolling();
        return;
      }

      if (data.status === "failed") {
        setError(data?.error || "Video failed");
        stopPolling();
        setLoading(false);
        return;
      }
    } catch (e: any) {
      if (!hasHandledComplete.current) {
        setError(e?.message ?? "Polling failed");
      }
      stopPolling();
      setLoading(false);
    }
  }

  async function generate() {
    if (!canSubmit) return;

    stopPolling();
    hasHandledComplete.current = false;

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

      pollTimer.current = window.setInterval(() => {
        poll(data.id);
      }, 2000) as unknown as number;
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 34, fontWeight: 750, marginBottom: 6 }}>
        Video Maker
      </h1>

      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Describe a short video. Zenavant generates it.
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
        <label
          style={{ display: "block", fontWeight: 650, marginBottom: 8 }}
        >
          Prompt
        </label>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: A calm cinematic shot of a desk by a window. Slow camera push-in."
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            boxSizing: "border-box",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label style={{ fontSize: 14, opacity: 0.85 }}>Size</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          >
            <option value="1280x720">1280x720 (landscape)</option>
            <option value="720x1280">720x1280 (portrait)</option>
            <option value="1792x1024">1792x1024 (wide HD)</option>
            <option value="1024x1792">1024x1792 (tall HD)</option>
          </select>

          <label style={{ fontSize: 14, opacity: 0.85 }}>Seconds</label>
          <select
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          >
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
            <div>
              <b>Status:</b> {status ?? "-"}
            </div>
            <div>
              <b>Progress:</b> {progress}%
            </div>
          </div>
        )}

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
              marginTop: 10,
              width: "100%",
              height: "auto",
              borderRadius: 10,
            }}
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
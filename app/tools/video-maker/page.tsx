"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type JobStatus = "queued" | "in_progress" | "completed" | "failed";

type VideoResult = {
  jobId: string;
  status: JobStatus | null;
  progress: number;
  videoUrl: string | null;
  error: string | null;
};

export default function VideoMakerPage() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1280x720");
  const [seconds, setSeconds] = useState("8");
  const [numOutputs, setNumOutputs] = useState(1);

  const [loading, setLoading] = useState(false);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<number | null>(null);
  const canSubmit = prompt.trim().length >= 5;

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

  useEffect(() => {
    const saved = localStorage.getItem("zenavant_prompt");
    if (saved) {
      setPrompt(saved);
      localStorage.removeItem("zenavant_prompt");
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  function stopPolling() {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function pollOne(id: string) {
    const res = await fetch(`/api/video-maker?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });

    const text = await res.text();
    let data: any = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || "Invalid server response" };
    }

    if (!res.ok) {
      throw new Error(data?.error || "Status check failed");
    }

    return data;
  }

  async function pollAll(ids: string[]) {
    try {
      const all = await Promise.all(
        ids.map(async (id) => {
          const data = await pollOne(id);
          return {
            jobId: id,
            status: (data.status ?? null) as JobStatus | null,
            progress: typeof data.progress === "number" ? data.progress : 0,
            videoUrl: data.downloadUrl || null,
            error: data.status === "failed" ? data.error || "Video failed" : null,
          } satisfies VideoResult;
        })
      );

      setResults(all);

      const hasFailure = all.some((item) => item.status === "failed");
      const allCompleted = all.length > 0 && all.every((item) => item.status === "completed");
      const allFinished = all.length > 0 && all.every((item) =>
        item.status === "completed" || item.status === "failed"
      );

      if (hasFailure) {
        const firstFailure = all.find((item) => item.error)?.error || "One or more videos failed";
        setError(firstFailure);
      }

      if (allFinished) {
        stopPolling();
        setLoading(false);
        if (allCompleted) {
          setPrompt("");
        }
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
    setJobIds([]);
    setResults([]);

    try {
      const res = await fetch("/api/video-maker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          size,
          seconds,
          numOutputs,
        }),
      });

      const text = await res.text();
      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || "Invalid server response" };
      }

      if (!res.ok) {
        setError(data?.error || "Request failed");
        setLoading(false);
        return;
      }

      const ids: string[] = Array.isArray(data?.ids)
        ? data.ids
        : data?.id
        ? [data.id]
        : [];

      if (ids.length === 0) {
        setError("No job IDs returned");
        setLoading(false);
        return;
      }

      setJobIds(ids);
      setResults(
        ids.map((id) => ({
          jobId: id,
          status: (data.status ?? "queued") as JobStatus,
          progress: typeof data.progress === "number" ? data.progress : 0,
          videoUrl: null,
          error: null,
        }))
      );

      pollTimer.current = window.setInterval(() => {
        pollAll(ids);
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
        <label style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>
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
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>
            Number of Outputs
          </label>
          <select
            value={numOutputs}
            onChange={(e) => setNumOutputs(Number(e.target.value))}
            style={{
              padding: "10px 12px",
              fontSize: 16,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "#fff",
            }}
          >
            <option value={1}>1 (Fastest)</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>

          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
            More outputs give you more variations, but use more credits.
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || !canSubmit}
          style={{
            marginTop: 16,
            padding: "10px 14px",
            fontSize: 16,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.2)",
            background: loading || !canSubmit ? "rgba(0,0,0,0.08)" : "#111",
            color: loading || !canSubmit ? "#444" : "#fff",
            cursor: loading || !canSubmit ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Generating..." : "Generate Video"}
        </button>

        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
          Keep this page open while generating. Closing or refreshing the page can interrupt the visible progress and may cause errors when you return.
        </div>

        {jobIds.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 14, opacity: 0.85 }}>
            <b>Jobs:</b> {jobIds.length}
          </div>
        )}

        {results.length > 0 && (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {results.map((item, index) => (
              <div
                key={item.jobId}
                style={{
                  padding: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 10,
                  background: "#fafafa",
                }}
              >
                <div style={{ fontSize: 14 }}>
                  <b>Output {index + 1}</b>
                </div>
                <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85 }}>
                  <div>
                    <b>Status:</b> {item.status ?? "-"}
                  </div>
                  <div>
                    <b>Progress:</b> {item.progress}%
                  </div>
                  {item.error && (
                    <div style={{ color: "#991b1b", marginTop: 4 }}>{item.error}</div>
                  )}
                </div>
              </div>
            ))}
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

      {results.some((item) => item.videoUrl) && (
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
            Results
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                results.filter((item) => item.videoUrl).length > 1
                  ? "repeat(auto-fit, minmax(260px, 1fr))"
                  : "1fr",
              gap: 16,
              marginTop: 10,
            }}
          >
            {results.map((item, index) =>
              item.videoUrl ? (
                <div key={`${item.jobId}-${index}`}>
                  <video
                    controls
                    src={item.videoUrl}
                    style={{
                      width: "100%",
                      height: "auto",
                      borderRadius: 10,
                    }}
                  />
                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
                    Output {index + 1}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <a href={item.videoUrl} download style={{ fontSize: 14 }}>
                      Download video
                    </a>
                  </div>
                </div>
              ) : null
            )}
          </div>
        </section>
      )}
    </main>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";

type SoraStatus = "queued" | "in_progress" | "completed" | "failed";
type LipStatus = "starting" | "processing" | "succeeded" | "failed" | "completed";

export default function ImageToVideoPlusLipSyncPage() {
  // --- Step 1: Image -> Video (Sora) ---
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState("8");
  const [size, setSize] = useState("1280x720");
  const [model, setModel] = useState<"sora-2" | "sora-2-pro">("sora-2");

  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<SoraStatus | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<number | null>(null);
  function stopPolling() {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function pollSora(id: string) {
    try {
      const res = await fetch(`/api/image-to-video?id=${encodeURIComponent(id)}`);
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

  async function generateSora() {
    setError(null);
    setVideoUrl(null);
    setJobId(null);
    setStatus(null);
    setProgress(0);

    if (!file) return setError("Choose an image first.");
    if (prompt.trim().length < 3) return setError("Write a prompt (3+ characters).");

    stopPolling();
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prompt", prompt);
      fd.append("seconds", seconds);
      fd.append("size", size);
      fd.append("model", model);

      const res = await fetch("/api/image-to-video", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        setError(data?.error || "Create failed");
        return;
      }

      setJobId(data.id);
      setStatus(data.status);
      setProgress(typeof data.progress === "number" ? data.progress : 0);

      pollTimer.current = window.setInterval(() => pollSora(data.id), 2000) as unknown as number;
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  useEffect(() => () => stopPolling(), []);

  // --- Step 2: Lip Sync ---
  const [audio, setAudio] = useState<File | null>(null);
  const [lipLoading, setLipLoading] = useState(false);
  const [lipId, setLipId] = useState<string | null>(null);
  const [lipStatus, setLipStatus] = useState<LipStatus | null>(null);
  const [lipVideoUrl, setLipVideoUrl] = useState<string | null>(null);

  const lipTimer = useRef<number | null>(null);
  function stopLipPolling() {
    if (lipTimer.current) {
      window.clearInterval(lipTimer.current);
      lipTimer.current = null;
    }
  }

  async function pollLip(id: string) {
    try {
      const res = await fetch(`/api/lipsync?id=${encodeURIComponent(id)}`);
      const data = await res.json();

      if (!res.ok) {
        setLipLoading(false);
        setError(data?.error || "Lip status failed");
        stopLipPolling();
        return;
      }

      if (data.status === "completed") {
        setLipStatus("completed");
        setLipVideoUrl(data.downloadUrl);
        setLipLoading(false);
        stopLipPolling();
        return;
      }

      if (data.status === "failed") {
        setLipStatus("failed");
        setError(data.error || "Lip sync failed");
        setLipLoading(false);
        stopLipPolling();
        return;
      }

      setLipStatus(data.status);
    } catch (e: any) {
      setLipLoading(false);
      setError(e?.message ?? "Lip polling failed");
      stopLipPolling();
    }
  }

  async function runLipSync() {
    setError(null);
    setLipVideoUrl(null);
    setLipId(null);
    setLipStatus(null);

    if (!videoUrl) return setError("Generate the video first (Step 1).");
    if (!audio) return setError("Upload a WAV audio file first.");

    stopLipPolling();
    setLipLoading(true);

    try {
      const fd = new FormData();
      fd.append("videoUrl", videoUrl);
      fd.append("audio", audio);

      const res = await fetch("/api/lipsync", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setLipLoading(false);
        setError(data?.error || "Lip sync create failed");
        return;
      }

      setLipId(data.id);
      setLipStatus(data.status);

      lipTimer.current = window.setInterval(() => pollLip(data.id), 2000) as unknown as number;
    } catch (e: any) {
      setLipLoading(false);
      setError(e?.message ?? "Something went wrong");
    }
  }

  useEffect(() => () => stopLipPolling(), []);

  const canGenerateVideo = !!file && prompt.trim().length >= 3 && !loading;
  const canLipSync = !!videoUrl && !!audio && !lipLoading;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 34, fontWeight: 750, marginBottom: 6 }}>
        Image → Video + Audio Lip Sync
      </h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Step 1: animate the image with Sora. Step 2: upload audio and lip-sync.
      </p>

      {/* Step 1 */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          background: "rgba(255,255,255,0.9)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 750, marginTop: 0 }}>Step 1 — Generate video</h2>

        <div style={{ marginTop: 8 }}>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>

        <label style={{ display: "block", fontWeight: 650, marginTop: 12, marginBottom: 8 }}>
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: Talking head, natural speaking motion, subtle camera push-in."
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.18)",
            outline: "none",
            background: "#fff",
            color: "#111",
          }}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 14, opacity: 0.85 }}>Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as any)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "#fff",
            }}
          >
            <option value="sora-2">sora-2</option>
            <option value="sora-2-pro">sora-2-pro</option>
          </select>

          <label style={{ fontSize: 14, opacity: 0.85 }}>Size</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "#fff",
            }}
          >
            <option value="1280x720">1280×720</option>
            <option value="720x1280">720×1280</option>
            <option value="1792x1024">1792×1024</option>
            <option value="1024x1792">1024×1792</option>
          </select>

          <label style={{ fontSize: 14, opacity: 0.85 }}>Seconds</label>
          <select
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "#fff",
            }}
          >
            <option value="4">4</option>
            <option value="8">8</option>
            <option value="12">12</option>
          </select>

          <button
            onClick={generateSora}
            disabled={!canGenerateVideo}
            style={{
              marginLeft: "auto",
              padding: "10px 14px",
              fontSize: 16,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: !canGenerateVideo ? "rgba(0,0,0,0.08)" : "#111",
              color: !canGenerateVideo ? "#444" : "#fff",
              cursor: !canGenerateVideo ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate video"}
          </button>
        </div>

        {(jobId || status) && (
          <div style={{ marginTop: 12, fontSize: 14, opacity: 0.85 }}>
            <div><b>Job ID:</b> {jobId ?? "—"}</div>
            <div><b>Status:</b> {status ?? "—"}</div>
            <div><b>Progress:</b> {progress}%</div>
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
            background: "rgba(255,255,255,0.9)",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 750, marginTop: 0 }}>Sora Result</h2>
          <video
            controls
            src={videoUrl}
            style={{
              marginTop: 10,
              width: "100%",
              height: "auto",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />
        </section>
      )}

      {/* Step 2 */}
      <div
        style={{
          marginTop: 18,
          padding: 16,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          background: "rgba(255,255,255,0.9)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 750, marginTop: 0 }}>Step 2 — Upload audio + lip-sync</h2>
        <p style={{ marginTop: 6, opacity: 0.8 }}>
          Lipsync 2 expects a <b>WAV</b> audio input. (We can upgrade later for MP3/M4A.)
        </p>

        <div style={{ marginTop: 8 }}>
          <input type="file" accept="audio/wav" onChange={(e) => setAudio(e.target.files?.[0] ?? null)} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={runLipSync}
            disabled={!canLipSync}
            style={{
              padding: "10px 14px",
              fontSize: 16,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: !canLipSync ? "rgba(0,0,0,0.08)" : "#111",
              color: !canLipSync ? "#444" : "#fff",
              cursor: !canLipSync ? "not-allowed" : "pointer",
            }}
          >
            {lipLoading ? "Lip-syncing..." : "Run lip sync"}
          </button>

          {(lipId || lipStatus) && (
            <div style={{ fontSize: 14, opacity: 0.85 }}>
              <div><b>Lip Job:</b> {lipId ?? "—"}</div>
              <div><b>Status:</b> {lipStatus ?? "—"}</div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(220, 38, 38, 0.35)",
            background: "rgba(220, 38, 38, 0.06)",
            color: "#7f1d1d",
          }}
        >
          {error}
        </div>
      )}

      {lipVideoUrl && (
        <section
          style={{
            marginTop: 18,
            padding: 16,
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.9)",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 750, marginTop: 0 }}>Lip-synced Result</h2>
          <video
            controls
            src={lipVideoUrl}
            style={{
              marginTop: 10,
              width: "100%",
              height: "auto",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />
          <div style={{ marginTop: 10 }}>
            <a href={lipVideoUrl} download style={{ fontSize: 14 }}>
              Download lip-synced video
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
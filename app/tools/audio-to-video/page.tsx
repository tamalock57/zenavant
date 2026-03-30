"use client";

import { useEffect, useRef, useState } from "react";

export default function Page() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [prompt, setPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handled = useRef(false);

  useEffect(() => {
    if (!jobId) return;

    const timer = setInterval(async () => {
      const res = await fetch(`/api/audio-to-video?id=${jobId}`);
      const data = await res.json();

      setStatus(data.status);

      if (data.status === "completed" && !handled.current) {
        handled.current = true;
        setVideoUrl(data.downloadUrl);
        setLoading(false);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [jobId]);

  async function generate() {
    handled.current = false;
    setLoading(true);

    const fd = new FormData();
    const file = fileRef.current?.files?.[0];
    if (file) fd.append("audio", file);

    fd.append("prompt", prompt);

    const res = await fetch("/api/audio-to-video", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();

    setJobId(data.id);
    setStatus(data.status);
  }

  return (
    <main style={{ maxWidth: 700, margin: "auto", padding: 24 }}>
      <h1>Audio → Video</h1>

      <input ref={fileRef} type="file" accept="audio/*" />

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe visuals..."
      />

      <button
        onClick={generate}
        disabled={loading}
        style={{
          padding: "10px 14px",
          background: "#111",
          color: "#fff",
          borderRadius: 10,
        }}
      >
        {loading ? "Working..." : "Generate Video"}
      </button>

      <div>Status: {status}</div>

      {videoUrl && <video controls src={videoUrl} style={{ width: "100%" }} />}
    </main>
  );
}
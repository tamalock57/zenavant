"use client";

import { useEffect, useRef, useState } from "react";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handled = useRef(false);

  useEffect(() => {
    if (!jobId) return;

    const timer = setInterval(async () => {
      const res = await fetch(`/api/image-to-video?id=${jobId}`);
      const data = await res.json();

      setStatus(data.status);

      if (data.status === "completed" && !handled.current) {
        handled.current = true;
        setVideoUrl(data.downloadUrl);
        setLoading(false);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [jobId]);

  async function generate() {
    handled.current = false;
    setLoading(true);
    setVideoUrl(null);

    const fd = new FormData();
    if (file) fd.append("file", file);
    fd.append("prompt", prompt);

    const res = await fetch("/api/image-to-video", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();

    setJobId(data.id);
    setStatus(data.status);
  }

  return (
    <main style={{ maxWidth: 700, margin: "auto", padding: 24 }}>
      <h1>Image → Video</h1>

      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe motion..."
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
        {loading ? "Generating..." : "Generate Video"}
      </button>

      <div>Status: {status}</div>

      {videoUrl && <video controls src={videoUrl} style={{ width: "100%" }} />}
    </main>
  );
}
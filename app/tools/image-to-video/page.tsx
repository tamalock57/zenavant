"use client";

import { useEffect, useRef, useState } from "react";

const SIZE_OPTIONS = [
  { value: "1280x720", label: "1280x720 (Landscape)" },
  { value: "720x1280", label: "720x1280 (Portrait)" },
];

const SECOND_OPTIONS = ["4", "8", "12"];

export default function ImageToVideoPage() {
  const handled = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const refFilesRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState("8");
  const [size, setSize] = useState("1280x720");
  const [model, setModel] = useState("sora-2");
  const [fitMode, setFitMode] = useState<"preserve" | "fill">("preserve");

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
      referenceFiles.forEach((f) => fd.append("references", f));

      fd.append("prompt", prompt);
      fd.append("seconds", seconds);
      fd.append("size", size);
      fd.append("model", model);
      fd.append("fitMode", fitMode);

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
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 34, fontWeight: 750 }}>Image → Video</h1>

      {/* MAIN IMAGE */}
      <div style={{ marginTop: 16 }}>
        <label>Upload Main Image</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* REFERENCE IMAGES */}
      <div style={{ marginTop: 16 }}>
        <label>Reference Images (optional)</label>
        <input
          ref={refFilesRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) =>
            setReferenceFiles(Array.from(e.target.files ?? []))
          }
        />
      </div>

      {/* PROMPT */}
      <div style={{ marginTop: 16 }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe motion..."
          rows={4}
          style={{ width: "100%", padding: 12 }}
        />
      </div>

      {/* SETTINGS */}
      <div style={{ marginTop: 16 }}>
        <select value={seconds} onChange={(e) => setSeconds(e.target.value)}>
          {SECOND_OPTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select value={size} onChange={(e) => setSize(e.target.value)}>
          {SIZE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* FIT MODE */}
      <div style={{ marginTop: 16 }}>
        <label>Fit Mode</label>
        <select
          value={fitMode}
          onChange={(e) =>
            setFitMode(e.target.value as "preserve" | "fill")
          }
        >
          <option value="preserve">Preserve (faces)</option>
          <option value="fill">Fill (crop)</option>
        </select>
      </div>

      <button onClick={generate} disabled={loading} style={{ marginTop: 16 }}>
        {loading ? "Generating..." : "Generate"}
      </button>

      <div>Status: {status}</div>

      {error && <div style={{ color: "red" }}>{error}</div>}

      {videoUrl && <video src={videoUrl} controls style={{ width: "100%" }} />}
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const SIZE_OPTIONS = [
  { value: "1280x720", label: "1280x720 (Landscape)" },
  { value: "720x1280", label: "720x1280 (Portrait)" },
];

const SECOND_OPTIONS = ["4", "8", "12"];

export default function ImageToVideoPage() {
  const handled = useRef(false);

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
        const res = await fetch(
          `/api/image-to-video?id=${encodeURIComponent(jobId)}`,
          { cache: "no-store" }
        );

        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { error: text || "Invalid server response" };
        }

        if (!res.ok) {
          setError(data?.error || "Failed to refresh status");
          setLoading(false);
          return;
        }

        setStatus(data.status ?? null);

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
      if (!file) {
        setError("Please upload a main image.");
        setLoading(false);
        return;
      }

      if (!prompt.trim()) {
        setError("Please enter a motion prompt.");
        setLoading(false);
        return;
      }

      const fd = new FormData();
      fd.append("file", file);
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

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || "Invalid server response" };
      }

      if (!res.ok) {
        setError(data?.error || "Video generation failed");
        setLoading(false);
        return;
      }

      setJobId(data.id ?? null);
      setStatus(data.status ?? "queued");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 34, fontWeight: 750, marginBottom: 6 }}>
        Image → Video
      </h1>

      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Upload a main image, optional reference images, and generate motion from your prompt.
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
            Upload Main Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
            {file?.name || "No file chosen"}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>
            Reference Images (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setReferenceFiles(Array.from(e.target.files ?? []))}
          />
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
            {referenceFiles.length > 0
              ? `${referenceFiles.length} reference image(s) selected`
              : "No reference images selected"}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
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

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 14, marginBottom: 6, opacity: 0.85 }}>
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                padding: "10px 12px",
                fontSize: 16,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.2)",
                background: "#fff",
              }}
            >
              <option value="sora-2">sora-2</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 14, marginBottom: 6, opacity: 0.85 }}>
              Video Length
            </label>
            <select
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              style={{
                padding: "10px 12px",
                fontSize: 16,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.2)",
                background: "#fff",
              }}
            >
              {SECOND_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s} seconds
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 14, marginBottom: 6, opacity: 0.85 }}>
              Size
            </label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              style={{
                padding: "10px 12px",
                fontSize: 16,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.2)",
                background: "#fff",
              }}
            >
              {SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>
            Fit Mode
          </label>
          <select
            value={fitMode}
            onChange={(e) => setFitMode(e.target.value as "preserve" | "fill")}
            style={{
              padding: "10px 12px",
              fontSize: 16,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "#fff",
            }}
          >
            <option value="preserve">Preserve (faces)</option>
            <option value="fill">Fill (crop)</option>
          </select>

          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
            Preserve keeps the whole image. Fill crops to frame and is usually better when your crop is already strong.
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          style={{
            marginTop: 16,
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
          <b>Status:</b> {status ?? "—"}
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

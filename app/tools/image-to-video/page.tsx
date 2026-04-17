"use client";

import { useEffect, useRef, useState } from "react";

const SIZE_OPTIONS = [
  { value: "1280x720", label: "1280x720 (Landscape)" },
  { value: "720x1280", label: "720x1280 (Portrait)" },
];

const SECOND_OPTIONS = ["4", "8", "12"];

type JobStatus = "queued" | "in_progress" | "completed" | "failed";

type VideoResult = {
  jobId: string;
  status: JobStatus | null;
  progress: number;
  videoUrl: string | null;
  error: string | null;
};

export default function ImageToVideoPage() {
  const handled = useRef(false);

  const [file, setFile] = useState<File | null>(null);
  const [referenceSlots, setReferenceSlots] = useState<(File | null)[]>([
    null,
    null,
    null,
  ]);
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState("8");
  const [size, setSize] = useState("1280x720");
  const [model, setModel] = useState("sora-2");
  const [fitMode, setFitMode] = useState<"preserve" | "fill">("preserve");
  const [numOutputs, setNumOutputs] = useState(1);

  const [loading, setLoading] = useState(false);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<number | null>(null);

  function stopPolling() {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  function updateReferenceSlot(index: number, nextFile: File | null) {
    setReferenceSlots((prev) => {
      const next = [...prev];
      next[index] = nextFile;
      return next;
    });
  }

  function addReferenceSlot() {
    setReferenceSlots((prev) => {
      if (prev.length >= 4) return prev;
      return [...prev, null];
    });
  }

  function removeReferenceSlot(index: number) {
    setReferenceSlots((prev) => {
      if (prev.length <= 1) return [null];
      return prev.filter((_, i) => i !== index);
    });
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  async function pollOne(id: string) {
    const res = await fetch(
      `/api/image-to-video?id=${encodeURIComponent(id)}`,
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
      throw new Error(data?.error || "Failed to refresh status");
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
            error:
              data.status === "failed"
                ? data.error || "Video generation failed"
                : null,
          } satisfies VideoResult;
        })
      );

      setResults(all);

      const hasFailure = all.some((item) => item.status === "failed");
      const allFinished =
        all.length > 0 &&
        all.every(
          (item) =>
            item.status === "completed" || item.status === "failed"
        );

      if (hasFailure && !handled.current) {
        const firstFailure =
          all.find((item) => item.error)?.error ||
          "One or more videos failed";
        setError(firstFailure);
      }

      if (allFinished) {
        handled.current = true;
        stopPolling();
        setLoading(false);
      }
    } catch (e: any) {
      if (!handled.current) {
        setError(e?.message || "Something went wrong");
      }
      stopPolling();
      setLoading(false);
    }
  }

  async function generate() {
    handled.current = false;
    stopPolling();

    setLoading(true);
    setError(null);
    setJobIds([]);
    setResults([]);

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

      referenceSlots
        .filter((slot): slot is File => slot instanceof File)
        .forEach((slot) => fd.append("references", slot));

      fd.append("prompt", prompt);
      fd.append("seconds", seconds);
      fd.append("size", size);
      fd.append("model", model);
      fd.append("fitMode", fitMode);
      fd.append("numOutputs", String(numOutputs));

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
        Upload a main image, add optional reference images, and generate motion
        from your prompt.
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

          <div style={{ display: "grid", gap: 12 }}>
            {referenceSlots.map((slotFile, index) => (
              <div
                key={index}
                style={{
                  padding: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 10,
                  background: "#fafafa",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 140, fontWeight: 600 }}>
                    Reference {index + 1}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      updateReferenceSlot(index, e.target.files?.[0] ?? null)
                    }
                  />

                  <button
                    type="button"
                    onClick={() => removeReferenceSlot(index)}
                    style={{
                      padding: "8px 10px",
                      fontSize: 14,
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.15)",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>

                <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
                  {slotFile?.name || "No file chosen"}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addReferenceSlot}
            disabled={referenceSlots.length >= 4}
            style={{
              marginTop: 12,
              padding: "10px 12px",
              fontSize: 14,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background:
                referenceSlots.length >= 4 ? "rgba(0,0,0,0.08)" : "#fff",
              color: "#111",
              cursor: referenceSlots.length >= 4 ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {referenceSlots.length >= 4
              ? "Maximum references added"
              : "Add Reference Slot"}
          </button>

          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
            Use cropped face images for stronger identity and wider images for
            clothing or background support.
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
            <label
              style={{
                display: "block",
                fontSize: 14,
                marginBottom: 6,
                opacity: 0.85,
              }}
            >
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
            <label
              style={{
                display: "block",
                fontSize: 14,
                marginBottom: 6,
                opacity: 0.85,
              }}
            >
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
            <label
              style={{
                display: "block",
                fontSize: 14,
                marginBottom: 6,
                opacity: 0.85,
              }}
            >
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
            onChange={(e) =>
              setFitMode(e.target.value as "preserve" | "fill")
            }
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
            Preserve keeps the whole image. Fill crops to frame and is usually
            better when your crop is already strong.
          </div>
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
            <option value={2}>2 (Recommended)</option>
            <option value={3}>3 (More variety)</option>
          </select>

          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
            Generates multiple versions so you can pick the best take. Uses more
            credits.
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

        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
          Keep this page open while generating. Closing or refreshing the page
          can interrupt the visible progress and may cause errors when you
          return.
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
                    <div style={{ color: "#991b1b", marginTop: 4 }}>
                      {item.error}
                    </div>
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
                      borderRadius: 10,
                      marginTop: 10,
                    }}
                  />
                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
                    Output {index + 1}
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
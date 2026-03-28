"use client";

import { useEffect, useRef, useState } from "react";

type VideoStatus = "queued" | "in_progress" | "completed" | "failed" | string;

export default function AudioToVideoPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState("8");
  const [size, setSize] = useState("1280x720");

  const [loading, setLoading] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [status, setStatus] = useState<VideoStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (!videoId) return;
  if (status === "completed" || status === "failed") return;

  const timer = setInterval(() => {
    refreshStatus();
  }, 3000);

  return () => clearInterval(timer);
}, [videoId, status]);

  async function startJob() {
    setError(null);
    setLoading(true);

    try {
      const fd = new FormData();

      const audioFile = fileRef.current?.files?.[0] ?? null;
      // We accept audio in the UI even though the Sora create call is prompt-based.
      // Keeping it here is future-proof for your Zenavant "audio-first" UX.
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
      setStatus(data.status);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function refreshStatus() {
    if (!videoId) {
    setError("Missing video id");
    setLoading(false);
    return;
  }
    

    try {
      const res = await fetch(`/api/audio-to-video?id=${encodeURIComponent(videoId)}`);
      const data = await res.json();

      setStatus(data.status);

      if (data.status === "completed" && videoId) {
      setVideoUrl(`/api/audio-to-video?id=${encodeURIComponent(videoId)}&content=1`);
  }


      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to fetch status");
      }

      setStatus(data.status);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Audio → Video (Sora 2 Pro)</h1>
        <p className="text-sm opacity-80">
          Start a video job, then hit “Refresh status” until it says completed.
        </p>
      </div>

      {/* Audio Upload */}
      <div>
        <label className="block font-medium">Upload Audio (optional for now)</label>
        <input ref={fileRef} type="file" accept="audio/*" className="mt-2 w-full" />
      </div>

      {/* Prompt */}
      <div>
        <label className="block font-medium">Describe Video</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="border rounded px-3 py-2 w-full mt-2"
          rows={4}
          placeholder="Example: A realistic man sitting at a desk speaking calmly to camera..."
        />
      </div>

      {/* Video Length */}
      <div>
        <label className="block font-medium">Video Length</label>
        <select
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
          className="border rounded px-3 py-2 w-full mt-2"
        >
          <option value="4">4 seconds</option>
          <option value="8">8 seconds</option>
          <option value="12">12 seconds</option>
        </select>
      </div>

      {/* Size */}
      <div>
        <label className="block font-medium">Size</label>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="border rounded px-3 py-2 w-full mt-2"
        >
          <option value="1280x720">1280x720 (Landscape)</option>
          <option value="720x1280">720x1280 (Portrait)</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={startJob}
          disabled={loading}
          className="border rounded px-4 py-2"
        >
          {loading ? "Working..." : "Generate Video"}
        </button>

        <button
          type="button"
          onClick={refreshStatus}
          disabled={loading || !videoId}
          className="border rounded px-4 py-2"
        >
          Refresh status
        </button>
      </div>

      {/* Output */}
      <div className="border rounded p-3">
        <div className="text-sm">
          <div><span className="font-medium">Video ID:</span> {videoId ?? "—"}</div>
          <div><span className="font-medium">Status:</span> {status ?? "—"}</div>
        </div>

      {videoUrl && (
        <div className="mt-4">
         <video controls className="w-full rounded border" src={videoUrl} />
      </div>
    )}

        {error && (
          <div className="mt-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}


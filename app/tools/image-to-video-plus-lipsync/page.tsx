"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type JobStatus = "queued" | "in_progress" | "completed" | "failed";
type LipStatus = "starting" | "processing" | "completed" | "failed";
type LipMode = "audio" | "text";

const I2V_MODELS = [
  { value: "bytedance/seedance-1-pro", label: "Seedance 1 Pro" },
  { value: "bytedance/seedance-2.0", label: "Seedance 2.0" },
  { value: "kwaivgi/kling-v2.5-turbo-pro", label: "Kling v2.5 Turbo" },
  { value: "kwaivgi/kling-v3-omni-video", label: "Kling v3 Omni" },
  { value: "minimax/video-01", label: "Minimax Video-01" },
  { value: "minimax/hailuo-02", label: "Hailuo 2" },
  { value: "wan-video/wan-2.5-i2v", label: "Wan 2.5 Image-to-Video" },
  { value: "lightricks/ltx-video", label: "LTX Video" },
];

export default function LipSyncPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);

  // Step 1 — Image to Video
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("bytedance/seedance-1-pro");
  const [seconds, setSeconds] = useState("5");
  const [size, setSize] = useState("1280x720");

  const [loading, setLoading] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<number | null>(null);

  // Step 2 — Lip Sync
  const [lipMode, setLipMode] = useState<LipMode>("audio");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [lipText, setLipText] = useState("");
  const [lipLoading, setLipLoading] = useState(false);
  const [lipStatus, setLipStatus] = useState<LipStatus | null>(null);
  const [lipVideoUrl, setLipVideoUrl] = useState<string | null>(null);

  const lipTimer = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { router.replace("/"); return; }
      setCheckingAuth(false);
    }
    checkSession();
    return () => { mounted = false; };
  }, [router]);

  useEffect(() => {
    return () => {
      stopPolling();
      stopLipPolling();
    };
  }, []);

  function stopPolling() {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  function stopLipPolling() {
    if (lipTimer.current) {
      window.clearInterval(lipTimer.current);
      lipTimer.current = null;
    }
  }

  async function pollVideo(id: string) {
    try {
      const res = await fetch(
        `/api/image-to-video?id=${encodeURIComponent(id)}&prompt=${encodeURIComponent(prompt)}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.status === "completed") {
        setJobStatus("completed");
        setVideoUrl(data.downloadUrl);
        setLoading(false);
        stopPolling();
      } else if (data.status === "failed") {
        setJobStatus("failed");
        setError(data.error || "Video generation failed");
        setLoading(false);
        stopPolling();
      } else {
        setJobStatus(data.status === "in_progress" ? "in_progress" : "queued");
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function generateVideo() {
    if (!imageFile) { alert("Please upload an image first."); return; }
    if (!prompt.trim()) { alert("Please add a prompt first."); return; }

    stopPolling();
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setJobStatus(null);
    setLipVideoUrl(null);
    setLipStatus(null);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("prompt", prompt);
      formData.append("modelId", modelId);
      formData.append("seconds", seconds);
      formData.append("size", size);

      const res = await fetch("/api/image-to-video", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start video generation.");
        setLoading(false);
        return;
      }

      setJobStatus("queued");
      pollTimer.current = window.setInterval(() => {
        pollVideo(data.id);
      }, 3000) as unknown as number;
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  async function pollLipSync(id: string) {
    try {
      const res = await fetch(
        `/api/lipsync?id=${encodeURIComponent(id)}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.status === "completed") {
        setLipStatus("completed");
        setLipVideoUrl(data.downloadUrl);
        setLipLoading(false);
        stopLipPolling();
      } else if (data.status === "failed") {
        setLipStatus("failed");
        setError(data.error || "Lip sync failed");
        setLipLoading(false);
        stopLipPolling();
      } else {
        setLipStatus(
          data.status === "processing" ? "processing" : "starting"
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function runLipSync() {
    if (!videoUrl) { alert("Generate a video first in Step 1."); return; }
    if (lipMode === "audio" && !audioFile) { alert("Please upload an audio file."); return; }
    if (lipMode === "text" && !lipText.trim()) { alert("Please enter text for lip sync."); return; }

    stopLipPolling();
    setLipLoading(true);
    setLipStatus(null);
    setLipVideoUrl(null);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("videoUrl", videoUrl);
      fd.append("mode", lipMode);
      if (lipMode === "audio" && audioFile) fd.append("audio", audioFile);
      if (lipMode === "text") fd.append("text", lipText);

      const res = await fetch("/api/lipsync", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Lip sync failed");
        setLipLoading(false);
        return;
      }

      setLipStatus("starting");
      lipTimer.current = window.setInterval(() => {
        pollLipSync(data.id);
      }, 3000) as unknown as number;
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setLipLoading(false);
    }
  }

  if (checkingAuth) {
    return <div className="max-w-3xl mx-auto p-4 text-black">Loading...</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6 text-black">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">Lip Sync</h1>
        <p className="text-neutral-600 mt-1">
          Step 1: Generate a video from an image. Step 2: Add lip sync with audio or text.
        </p>
      </div>

      {/* Step 1 */}
      <div className="rounded-2xl border border-neutral-300 bg-white p-4 space-y-4">
        <h2 className="text-lg font-semibold">Step 1 — Generate Video</h2>

        <div>
          <label className="block font-semibold mb-2">Upload Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Talking head, natural speaking motion, subtle camera push-in..."
            rows={4}
            className="w-full rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">Model</label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
          >
            {I2V_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Size</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
            >
              <option value="1280x720">1280x720 (Landscape)</option>
              <option value="720x1280">720x1280 (Portrait)</option>
              <option value="1024x1024">1024x1024 (Square)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Duration</label>
            <select
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
            >
              <option value="4">4 seconds</option>
              <option value="5">5 seconds</option>
              <option value="8">8 seconds</option>
              <option value="10">10 seconds</option>
            </select>
          </div>
        </div>

        <button
          onClick={generateVideo}
          disabled={loading || !imageFile || !prompt.trim()}
          className="w-full rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Generating Video..." : "Generate Video"}
        </button>

        {jobStatus && jobStatus !== "completed" && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
            <b>Status:</b> {jobStatus}
          </div>
        )}

        {videoUrl && (
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">
              Video ready! Proceed to Step 2.
            </p>
            <video
              controls
              src={videoUrl}
              className="w-full rounded-xl"
            />
          </div>
        )}
      </div>

      {/* Step 2 */}
      <div className={`rounded-2xl border p-4 space-y-4 ${
        videoUrl
          ? "border-neutral-300 bg-white"
          : "border-neutral-200 bg-neutral-50 opacity-60 pointer-events-none"
      }`}>
        <h2 className="text-lg font-semibold">Step 2 — Lip Sync</h2>

        {!videoUrl && (
          <p className="text-sm text-neutral-500">
            Complete Step 1 first to enable lip sync.
          </p>
        )}

        <div>
          <label className="block font-semibold mb-2">Lip Sync Mode</label>
          <select
            value={lipMode}
            onChange={(e) => setLipMode(e.target.value as LipMode)}
            className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
          >
            <option value="audio">Audio File</option>
            <option value="text">Text to Speech</option>
          </select>
        </div>

        {lipMode === "audio" && (
          <div>
            <label className="block font-semibold mb-2">Upload Audio</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
            />
            {audioFile && (
              <p className="mt-1 text-sm text-neutral-500">{audioFile.name}</p>
            )}
          </div>
        )}

        {lipMode === "text" && (
          <div>
            <label className="block font-semibold mb-2">Text to Speak</label>
            <textarea
              value={lipText}
              onChange={(e) => setLipText(e.target.value)}
              placeholder="Enter the text you want the person to say..."
              rows={4}
              className="w-full rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
            />
          </div>
        )}

        <button
          onClick={runLipSync}
          disabled={lipLoading || !videoUrl}
          className="w-full rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-50"
        >
          {lipLoading ? "Running Lip Sync..." : "Run Lip Sync"}
        </button>

        {lipStatus && lipStatus !== "completed" && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
            <b>Status:</b> {lipStatus}
          </div>
        )}

        {lipVideoUrl && (
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">
              Lip sync complete!
            </p>
            <video controls src={lipVideoUrl} className="w-full rounded-xl" />
            
              href={lipVideoUrl}
              download
              className="mt-2 inline-block text-sm text-black underline"
            <a>
              Download lip-synced video
            </a>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
    </main>
  );
}
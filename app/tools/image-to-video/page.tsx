"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type JobStatus = "queued" | "in_progress" | "completed" | "failed";

const I2V_MODELS = [
  { value: "bytedance/seedance-1-pro", label: "Seedance 1 Pro" },
  { value: "bytedance/seedance-2.0", label: "Seedance 2.0" },
  { value: "kwaivgi/kling-v2.5-turbo-pro", label: "Kling v2.5 Turbo" },
  { value: "kwaivgi/kling-v3-omni-video", label: "Kling v3 Omni" },
  { value: "minimax/video-01", label: "Minimax Video-01" },
  { value: "minimax/hailuo-02", label: "Hailuo 2" },
  { value: "wan-video/wan-2.5-i2v", label: "Wan 2.5 Image-to-Video" },
  { value: "wan-video/wan-2.2-i2v-fast", label: "Wan 2.2 Fast" },
  { value: "lightricks/ltx-video", label: "LTX Video" },
  { value: "google/veo-2", label: "Veo 2 text prompt only" },
];

export default function ImageToVideoPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [idea, setIdea] = useState("");
  const [prompt, setPrompt] = useState("");
  const [styleHint, setStyleHint] = useState("");
  const [intensity, setIntensity] = useState<"subtle" | "balanced" | "dramatic">("balanced");
  const [modelId, setModelId] = useState("bytedance/seedance-1-pro");
  const [seconds, setSeconds] = useState("5");
  const [size, setSize] = useState("1280x720");

  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<number | null>(null);

  const previewUrl = useMemo(() => {
    if (!imageFile) return "";
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

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
    return () => stopPolling();
  }, []);

  function stopPolling() {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function handleGeneratePrompt() {
    if (idea.trim().length < 5) {
      alert("Please describe the motion you want first.");
      return;
    }

    setLoadingPrompt(true);
    try {
      const res = await fetch("/api/turn-thought-into-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          mode: "image-to-video",
          intensity,
          styleHint,
        }),
      });

      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to generate prompt."); return; }
      setPrompt(data.finalPrompt || "");
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoadingPrompt(false);
    }
  }

  async function handleSavePrompt() {
    if (!prompt.trim()) { alert("No prompt to save."); return; }

    setSavingPrompt(true);
    try {
      const res = await fetch("/api/save-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Image to Video Prompt",
          idea,
          prompt,
          tool: "image-to-video",
          metadata: { styleHint, intensity, seconds, size, model: modelId },
        }),
      });

      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to save prompt."); return; }
      alert("Prompt saved to Library.");
    } catch (err) {
      console.error(err);
      alert("Failed to save prompt.");
    } finally {
      setSavingPrompt(false);
    }
  }

  async function pollStatus(id: string) {
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
        setError(data.error || "Generation failed");
        setLoading(false);
        stopPolling();
      } else {
        setJobStatus(data.status === "in_progress" ? "in_progress" : "queued");
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleGenerateVideo() {
    if (!imageFile) { alert("Please upload an image first."); return; }
    if (!prompt.trim()) { alert("Please add a prompt first."); return; }

    stopPolling();
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setJobId(null);
    setJobStatus(null);

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

      setJobId(data.id);
      setJobStatus("queued");

      pollTimer.current = window.setInterval(() => {
        pollStatus(data.id);
      }, 3000) as unknown as number;
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return <div className="max-w-3xl mx-auto p-4 text-black">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4 text-black">
      <h1 className="text-2xl font-semibold">Image to Video</h1>
      <p className="text-neutral-600">Upload an image and bring it to life.</p>

      <div className="rounded-2xl border border-neutral-300 bg-white p-4 space-y-4">

        {/* Image Upload */}
        <div>
          <label className="block font-semibold mb-2">Upload Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
          />
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="rounded-xl border border-neutral-200 overflow-hidden">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full object-cover max-h-64"
            />
          </div>
        )}

        {/* Idea */}
        <div>
          <label className="block font-semibold mb-2">Describe the motion</label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe what you want the image to do..."
            className="w-full min-h-[100px] rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
          />
        </div>

        {/* Style & Intensity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={styleHint}
            onChange={(e) => setStyleHint(e.target.value)}
            placeholder="Style hint (e.g., cinematic, realistic)"
            className="rounded-xl border border-neutral-300 bg-white p-3 text-black placeholder:text-neutral-500"
          />
          <select
            value={intensity}
            onChange={(e) => setIntensity(e.target.value as "subtle" | "balanced" | "dramatic")}
            className="rounded-xl border border-neutral-300 bg-white p-3 text-black"
          >
            <option value="subtle">Subtle</option>
            <option value="balanced">Balanced</option>
            <option value="dramatic">Dramatic</option>
          </select>
        </div>

        {/* Generate Prompt Button */}
        <button
          onClick={handleGeneratePrompt}
          disabled={loadingPrompt}
          className="w-full rounded-2xl bg-neutral-800 px-4 py-3 text-white disabled:opacity-50"
        >
          {loadingPrompt ? "Generating Prompt..." : "Generate Motion Prompt"}
        </button>

        {/* Prompt */}
        <div>
          <label className="block font-semibold mb-2">Motion Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Your motion prompt will appear here, or type one directly..."
            rows={5}
            className="w-full rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
          />
        </div>

        {/* Model */}
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

        {/* Size & Duration */}
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

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleSavePrompt}
            disabled={savingPrompt || !prompt.trim()}
            className="rounded-2xl bg-neutral-800 px-4 py-3 text-white disabled:opacity-50"
          >
            {savingPrompt ? "Saving..." : "Save Prompt to Library"}
          </button>

          <button
            onClick={handleGenerateVideo}
            disabled={loading || !prompt.trim() || !imageFile}
            className="rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? "Generating Video..." : "Generate Video"}
          </button>
        </div>

        {/* Status */}
        {jobStatus && jobStatus !== "completed" && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
            <b>Status:</b> {jobStatus}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        <p className="text-sm text-neutral-500">
          Keep this page open while generating.
        </p>
      </div>

      {/* Result */}
      {videoUrl && (
        <section className="rounded-2xl border border-neutral-300 bg-white p-4">
          <h2 className="text-lg font-semibold mb-4">Result</h2>
          <video controls src={videoUrl} className="w-full rounded-xl" />
          
            href={videoUrl}
            download
            className="mt-2 inline-block text-sm text-black underline"
          <a>
            Download video
          </a>
        </section>
      )}
    </div>
  );
}
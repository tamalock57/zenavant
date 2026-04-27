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

const VIDEO_MODELS = [
  { value: "bytedance/seedance-1-pro", label: "Seedance 1 Pro" },
  { value: "bytedance/seedance-2.0", label: "Seedance 2.0" },
  { value: "kwaivgi/kling-v3-video", label: "Kling v3" },
  { value: "kwaivgi/kling-v2.5-turbo-pro", label: "Kling v2.5 Turbo" },
  { value: "minimax/video-01", label: "Minimax Video-01" },
  { value: "minimax/hailuo-02", label: "Hailuo 2" },
  { value: "wan-video/wan-2.5-t2v", label: "Wan 2.5" },
  { value: "wan-video/wan-2.2-t2v-fast", label: "Wan 2.2 Fast" },
  { value: "lightricks/ltx-video", label: "LTX Video" },
  { value: "google/veo-2", label: "Veo 2" },
  { value: "google/veo-3.1-lite", label: "Veo 3.1 Lite" },
  { value: "tencent/hunyuan-video", label: "Hunyuan Video" },
];

export default function VideoMakerPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [idea, setIdea] = useState("");
  const [styleHint, setStyleHint] = useState("");
  const [intensity, setIntensity] = useState<"subtle" | "balanced" | "dramatic">("balanced");
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("bytedance/seedance-1-pro");
  const [size, setSize] = useState("1280x720");
  const [seconds, setSeconds] = useState("8");
  const [numOutputs, setNumOutputs] = useState(1);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<number | null>(null);
  const canSubmit = prompt.trim().length >= 5;

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { router.replace("/"); return; }
      setCheckingAuth(false);
    }

    checkUser();
    return () => { mounted = false; };
  }, [router]);

  useEffect(() => {
    const saved = localStorage.getItem("zenavant_prompt");
    if (saved) {
      setIdea(saved);
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

  async function handleGeneratePrompt() {
    if (idea.trim().length < 5) {
      alert("Please describe your video idea first.");
      return;
    }

    setLoadingPrompt(true);

    try {
      const res = await fetch("/api/turn-thought-into-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, mode: "video", intensity, styleHint }),
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

    if (!res.ok) throw new Error(data?.error || "Status check failed");
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

      const allFinished = all.length > 0 && all.every(
        (item) => item.status === "completed" || item.status === "failed"
      );
      const hasFailure = all.some((item) => item.status === "failed");

      if (hasFailure) {
        const firstFailure = all.find((item) => item.error)?.error || "One or more videos failed";
        setError(firstFailure);
      }

      if (allFinished) {
        stopPolling();
        setLoading(false);
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
        body: JSON.stringify({ prompt, modelId, size, seconds, numOutputs }),
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
          progress: 0,
          videoUrl: null,
          error: null,
        }))
      );

      pollTimer.current = window.setInterval(() => {
        pollAll(ids);
      }, 3000) as unknown as number;
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return <div className="max-w-3xl mx-auto p-4 text-black">Loading...</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4 text-black">
      <h1 className="text-2xl md:text-3xl font-semibold">Video Maker</h1>
      <p className="text-neutral-600">Describe a short video. Zenavant generates it.</p>

      <div className="rounded-2xl border border-neutral-300 bg-white p-4 space-y-4">

        {/* Prompt Generator */}
        <div>
          <label className="block font-semibold mb-2">Describe your idea</label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe the video you want to make..."
            className="w-full min-h-[100px] rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={styleHint}
            onChange={(e) => setStyleHint(e.target.value)}
            placeholder="Style hint (e.g., cinematic, noir)"
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

        <button
          onClick={handleGeneratePrompt}
          disabled={loadingPrompt}
          className="w-full rounded-2xl bg-neutral-800 px-4 py-3 text-white disabled:opacity-50"
        >
          {loadingPrompt ? "Generating Prompt..." : "Generate Prompt"}
        </button>

        {/* Prompt */}
        <div>
          <label className="block font-semibold mb-2">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Your video prompt will appear here, or type one directly..."
            rows={5}
            className="w-full rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
          />
        </div>

        {/* Model Selector */}
        <div>
          <label className="block font-semibold mb-2">Model</label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
          >
            {VIDEO_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Size & Seconds */}
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

        {/* Number of Outputs */}
        <div>
          <label className="block font-semibold mb-2">Number of Outputs</label>
          <select
            value={numOutputs}
            onChange={(e) => setNumOutputs(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
          >
            <option value={1}>1 (Fastest)</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
          <p className="mt-1 text-sm text-neutral-500">
            More outputs give you more variations but use more credits.
          </p>
        </div>

        {/* Generate Button */}
        <button
          onClick={generate}
          disabled={loading || !canSubmit}
          className="w-full rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Generating Video..." : "Generate Video"}
        </button>

        <p className="text-sm text-neutral-500">
          Keep this page open while generating. Closing or refreshing may interrupt progress.
        </p>

        {/* Job Status */}
        {results.length > 0 && (
          <div className="grid gap-3">
            {results.map((item, index) => (
              <div
                key={item.jobId}
                className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
              >
                <div className="text-sm font-semibold">Output {index + 1}</div>
                <div className="mt-1 text-sm text-neutral-700">
                  <div><b>Status:</b> {item.status ?? "-"}</div>
                  {item.error && <div className="mt-1 text-red-700">{item.error}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {results.some((item) => item.videoUrl) && (
        <section className="rounded-2xl border border-neutral-300 bg-white p-4">
          <h2 className="text-lg font-semibold mb-4">Results</h2>
          <div className={`grid gap-4 ${results.filter((i) => i.videoUrl).length > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}>
            {results.map((item, index) =>
              item.videoUrl ? (
                <div key={`${item.jobId}-${index}`}>
                  <video controls src={item.videoUrl} className="w-full rounded-xl" />
                  <div className="mt-2 text-sm text-neutral-500">Output {index + 1}</div>
                  
                    href={item.videoUrl}
                    download
                    className="mt-1 inline-block text-sm text-black underline"
                  <a>
                    Download video
                  </a>
                </div>
              ) : null
            )}
          </div>
        </section>
      )}
    </main>
  );
}
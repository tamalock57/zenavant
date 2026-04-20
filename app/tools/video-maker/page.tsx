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

export default function VideoMakerPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [idea, setIdea] = useState("");
  const [styleHint, setStyleHint] = useState("");
  const [intensity, setIntensity] = useState<"subtle" | "balanced" | "dramatic">("balanced");

  const [prompt, setPrompt] = useState("");
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        router.replace("/");
        return;
      }

      setCheckingAuth(false);
    }

    checkUser();

    return () => {
      mounted = false;
    };
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
    try {
      if (idea.trim().length < 5) {
        alert("Please describe your video idea first.");
        return;
      }

      setLoadingPrompt(true);

      const res = await fetch("/api/turn-thought-into-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea,
          mode: "video",
          intensity,
          styleHint,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to generate prompt.");
        return;
      }

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

    if (!res.ok) {
      throw new Error(data?.error || "Status check failed");
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
            error: data.status === "failed" ? data.error || "Video failed" : null,
          } satisfies VideoResult;
        })
      );

      setResults(all);

      const hasFailure = all.some((item) => item.status === "failed");
      const allCompleted =
        all.length > 0 && all.every((item) => item.status === "completed");
      const allFinished =
        all.length > 0 &&
        all.every(
          (item) =>
            item.status === "completed" || item.status === "failed"
        );

      if (hasFailure) {
        const firstFailure =
          all.find((item) => item.error)?.error || "One or more videos failed";
        setError(firstFailure);
      }

      if (allFinished) {
        stopPolling();
        setLoading(false);

        if (allCompleted) {
          setPrompt("");
        }
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
        body: JSON.stringify({
          prompt,
          size,
          seconds,
          numOutputs,
        }),
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
          progress: typeof data.progress === "number" ? data.progress : 0,
          videoUrl: null,
          error: null,
        }))
      );

      pollTimer.current = window.setInterval(() => {
        pollAll(ids);
      }, 2000) as unknown as number;
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="max-w-3xl mx-auto p-4 text-black">
        Loading...
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4 text-black">
      <h1 className="text-2xl md:text-3xl font-semibold">Video Maker</h1>
      <p className="text-neutral-600">
        Describe a short video. Zenavant generates it.
      </p>

      <div className="rounded-2xl border border-neutral-300 bg-white p-4 space-y-4">
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe the video you want to make..."
          className="w-full min-h-[120px] rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={styleHint}
            onChange={(e) => setStyleHint(e.target.value)}
            placeholder="Style hint (e.g., cinematic, noir, realistic)"
            className="rounded-xl border border-neutral-300 bg-white p-3 text-black placeholder:text-neutral-500"
          />

          <select
            value={intensity}
            onChange={(e) =>
              setIntensity(e.target.value as "subtle" | "balanced" | "dramatic")
            }
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

        <div>
          <label className="block font-semibold mb-2">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: A calm cinematic shot of a desk by a window. Slow camera push-in."
            rows={5}
            className="w-full rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto_1fr] gap-3 items-center">
          <label className="text-sm text-neutral-700">Size</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="rounded-xl border border-neutral-300 bg-white p-3 text-black"
          >
            <option value="1280x720">1280x720 (landscape)</option>
            <option value="720x1280">720x1280 (portrait)</option>
            <option value="1792x1024">1792x1024 (wide HD)</option>
            <option value="1024x1792">1024x1792 (tall HD)</option>
          </select>

          <label className="text-sm text-neutral-700">Seconds</label>
          <select
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            className="rounded-xl border border-neutral-300 bg-white p-3 text-black"
          >
            <option value="4">4</option>
            <option value="8">8</option>
            <option value="12">12</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-2">Number of Outputs</label>
          <select
            value={numOutputs}
            onChange={(e) => setNumOutputs(Number(e.target.value))}
            className="rounded-xl border border-neutral-300 bg-white p-3 text-black"
          >
            <option value={1}>1 (Fastest)</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>

          <div className="mt-2 text-sm text-neutral-600">
            More outputs give you more variations, but use more credits.
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || !canSubmit}
          className="w-full rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Generating Video..." : "Generate Video"}
        </button>

        <div className="text-sm text-neutral-600">
          Keep this page open while generating. Closing or refreshing the page can
          interrupt the visible progress and may cause errors when you return.
        </div>

        {jobIds.length > 0 && (
          <div className="text-sm text-neutral-700">
            <b>Jobs:</b> {jobIds.length}
          </div>
        )}

        {results.length > 0 && (
          <div className="grid gap-3">
            {results.map((item, index) => (
              <div
                key={item.jobId}
                className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
              >
                <div className="text-sm font-semibold">
                  Output {index + 1}
                </div>

                <div className="mt-2 text-sm text-neutral-700">
                  <div>
                    <b>Status:</b> {item.status ?? "-"}
                  </div>
                  <div>
                    <b>Progress:</b> {item.progress}%
                  </div>
                  {item.error && (
                    <div className="mt-2 text-red-700">{item.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}
      </div>

      {results.some((item) => item.videoUrl) && (
        <section className="rounded-2xl border border-neutral-300 bg-white p-4">
          <h2 className="text-lg font-semibold">Results</h2>

          <div
            className={`mt-4 grid gap-4 ${
              results.filter((item) => item.videoUrl).length > 1
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {results.map((item, index) =>
              item.videoUrl ? (
                <div key={`${item.jobId}-${index}`}>
                  <video
                    controls
                    src={item.videoUrl}
                    className="w-full rounded-xl"
                  />
                  <div className="mt-2 text-sm text-neutral-600">
                    Output {index + 1}
                  </div>
                  <div className="mt-2">
                    <a
                      href={item.videoUrl}
                      download
                      className="text-sm text-black underline"
                    >
                      Download video
                    </a>
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
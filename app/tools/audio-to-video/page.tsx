"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type JobStatus = "queued" | "in_progress" | "completed" | "failed";
type Mode = "native-audio" | "audio-to-video" | "audio-image-to-video";

const MODES = [
  {
    value: "native-audio",
    label: "Generate Video with Native Audio",
    description: "Text prompt only — generates a video with natural sound included",
  },
  {
    value: "audio-to-video",
    label: "Generate Video from Audio File",
    description: "Upload an audio file — generates visuals that match the audio",
  },
  {
    value: "audio-image-to-video",
    label: "Animate Image with Audio",
    description: "Upload an audio file and an image — animates the image to match the audio",
  },
];

export default function AudioToVideoPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mode, setMode] = useState<Mode>("native-audio");
  const [prompt, setPrompt] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [seconds, setSeconds] = useState("5");

  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<number | null>(null);

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

  async function pollStatus(id: string) {
    try {
      const res = await fetch(
        `/api/audio-to-video?id=${encodeURIComponent(id)}&prompt=${encodeURIComponent(prompt)}`,
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
        setJobStatus(
          data.status === "in_progress" ? "in_progress" : "queued"
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function generate() {
    if (!prompt.trim()) {
      alert("Please add a prompt first.");
      return;
    }

    if (mode !== "native-audio" && !audioFile) {
      alert("Please upload an audio file.");
      return;
    }

    if (mode === "audio-image-to-video" && !imageFile) {
      alert("Please upload an image file.");
      return;
    }

    stopPolling();
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setJobId(null);
    setJobStatus(null);

    try {
      const fd = new FormData();
      fd.append("mode", mode);
      fd.append("prompt", prompt);
      fd.append("seconds", seconds);

      if (audioFile) fd.append("audio", audioFile);
      if (imageFile) fd.append("image", imageFile);

      const res = await fetch("/api/audio-to-video", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Generation failed");
        setLoading(false);
        return;
      }

      setJobId(data.id);
      setJobStatus("queued");

      pollTimer.current = window.setInterval(() => {
        pollStatus(data.id);
      }, 3000) as unknown as number;
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return <div className="max-w-3xl mx-auto p-4 text-black">Loading...</div>;
  }

  const selectedMode = MODES.find((m) => m.value === mode);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4 text-black">
      <h1 className="text-2xl md:text-3xl font-semibold">Audio to Video</h1>
      <p className="text-neutral-600">
        Generate videos with audio, from audio, or animate images with sound.
      </p>

      <div className="rounded-2xl border border-neutral-300 bg-white p-4 space-y-4">

        {/* Mode Selector */}
        <div>
          <label className="block font-semibold mb-2">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {selectedMode && (
            <p className="mt-1 text-sm text-neutral-500">
              {selectedMode.description}
            </p>
          )}
        </div>

        {/* Audio Upload */}
        {(mode === "audio-to-video" || mode === "audio-image-to-video") && (
          <div>
            <label className="block font-semibold mb-2">Upload Audio</label>
            <input
              type="file"
              accept=".mp3,.wav,.mp4,.m4a"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
            />
            {audioFile && (
              <p className="mt-1 text-sm text-neutral-500">{audioFile.name}</p>
            )}
          </div>
        )}

        {/* Image Upload */}
        {mode === "audio-image-to-video" && (
          <div>
            <label className="block font-semibold mb-2">Upload Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
            />
            {imageFile && (
              <p className="mt-1 text-sm text-neutral-500">{imageFile.name}</p>
            )}
          </div>
        )}

        {/* Prompt */}
        <div>
          <label className="block font-semibold mb-2">
            {mode === "native-audio"
              ? "Describe the video and audio"
              : "Describe the visuals"}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === "native-audio"
                ? "A calm rainy street at night with soft jazz playing..."
                : "Describe what the visuals should look like..."
            }
            rows={4}
            className="w-full rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Duration
          </label>
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

        {/* Generate Button */}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Video"}
        </button>

        <p className="text-sm text-neutral-500">
          Keep this page open while generating.
        </p>

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
    </main>
  );
}
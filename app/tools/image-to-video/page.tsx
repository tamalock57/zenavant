"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PromptResult = {
  title: string;
  summary: string;
  subject: string;
  setting: string;
  action: string;
  emotion: string;
  camera: string;
  style: string;
  rules: string[];
  finalPrompt: string;
};

export default function ImageToVideoPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [idea, setIdea] = useState("");
  const [prompt, setPrompt] = useState("");
  const [styleHint, setStyleHint] = useState("");
  const [intensity, setIntensity] = useState<"subtle" | "balanced" | "dramatic">("balanced");
  const [seconds, setSeconds] = useState<"4" | "8" | "12">("4");
  const [size, setSize] = useState("1280x720");
  const [fit, setFit] = useState("preserve");

  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);

  const [videoUrl, setVideoUrl] = useState("");
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
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

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  const previewUrl = useMemo(() => {
    if (!imageFile) return "";
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  function buildFallbackMotionPrompt() {
    return `The subject remains consistent with the uploaded image.

Scene:
${idea}

Style:
${styleHint || "realistic cinematic video"}

Intensity:
${intensity}

Motion guidance:
Natural, believable movement. Keep the action grounded and visually clear. Show the subjects performing the described activity in a way that matches the scene.

Camera:
Steady cinematic framing with realistic movement and readable composition.

Rules:
- no text, subtitles, logos, or watermarks
- no surreal behavior
- no random scene changes
- no identity drift
- no exaggerated motion unless clearly requested`;
  }

  async function handleGeneratePrompt() {
    try {
      if (idea.trim().length < 5) {
        alert("Please describe the motion or reaction you want first.");
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
          mode: "image-to-video",
          intensity,
          styleHint,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const fallback = buildFallbackMotionPrompt();
        setPrompt(fallback);
        alert(data.error || "Prompt tool failed, so Zenavant built a fallback prompt instead.");
        return;
      }

      setPromptResult(data);

      const candidate = (data.finalPrompt || "").trim();

      const badPrompt =
        !candidate ||
        candidate.length < 40 ||
        candidate === "The subject remains consistent with the uploaded image.";

      setPrompt(badPrompt ? buildFallbackMotionPrompt() : candidate);
    } catch (err) {
      console.error(err);
      setPrompt(buildFallbackMotionPrompt());
      alert("Prompt tool failed, so Zenavant built a fallback prompt instead.");
    } finally {
      setLoadingPrompt(false);
    }
  }

  async function handleSavePrompt() {
    try {
      if (!prompt.trim()) {
        alert("No prompt to save.");
        return;
      }

      setSavingPrompt(true);

      const title = promptResult?.title || "Image to Video Prompt";

      const res = await fetch("/api/save-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          idea,
          prompt,
          tool: "image-to-video",
          metadata: {
            styleHint,
            intensity,
            seconds,
            size,
            fit,
            referenceCount: referenceImages.length,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to save prompt.");
        return;
      }

      alert("Prompt saved to Library.");
    } catch (err) {
      console.error(err);
      alert("Failed to save prompt.");
    } finally {
      setSavingPrompt(false);
    }
  }

  async function handleGenerateVideo() {
    try {
      if (!imageFile) {
        alert("Please upload an image first.");
        return;
      }

      if (!idea.trim() && !prompt.trim()) {
        alert("Add an idea or prompt first.");
        return;
      }

      let finalPrompt = prompt.trim();

      if (
        !finalPrompt ||
        finalPrompt === "The subject remains consistent with the uploaded image."
      ) {
        finalPrompt = buildFallbackMotionPrompt();
        setPrompt(finalPrompt);
      }

      setLoadingVideo(true);
      setVideoUrl("");

      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("idea", idea);
      formData.append("prompt", finalPrompt);
      formData.append("intensity", intensity);
      formData.append("size", size);
      formData.append("seconds", seconds);
      formData.append("fit", fit);

      referenceImages.forEach((file) => {
        formData.append("referenceImages", file);
      });

      const res = await fetch("/api/image-to-video", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to generate video.");
        return;
      }

      if (data?.prompt) {
        setPrompt(data.prompt);
      }

      setVideoUrl(data?.url || "");
      alert("Video generated and saved to Library.");
    } catch (err) {
      console.error(err);
      alert("Video generation failed.");
    } finally {
      setLoadingVideo(false);
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
    <div className="max-w-3xl mx-auto p-4 space-y-4 text-black">
      <h1 className="text-2xl font-semibold">Image to Video</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
      />

      <div className="space-y-2">
        <label className="text-sm text-neutral-600">
          Additional references (optional)
        </label>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            setReferenceImages(files);
          }}
          className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
        />

        {referenceImages.length > 0 && (
          <div className="text-xs text-neutral-500">
            {referenceImages.length} reference image(s) selected
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="rounded-2xl border border-neutral-300 bg-white p-4">
          <div className="mb-2 text-sm text-neutral-500">Preview</div>
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full rounded-xl object-cover"
          />
        </div>
      )}

      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Describe the motion or reaction you want..."
        className="w-full min-h-[120px] rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={styleHint}
          onChange={(e) => setStyleHint(e.target.value)}
          placeholder="Style hint (e.g., cinematic, Pixar, noir, realistic)"
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

        <select
          value={seconds}
          onChange={(e) => setSeconds(e.target.value as "4" | "8" | "12")}
          className="rounded-xl border border-neutral-300 bg-white p-3 text-black"
        >
          <option value="4">4 seconds</option>
          <option value="8">8 seconds</option>
          <option value="12">12 seconds</option>
        </select>

        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="rounded-xl border border-neutral-300 bg-white p-3 text-black"
        >
          <option value="1280x720">1280x720</option>
          <option value="720x1280">720x1280</option>
        </select>
      </div>

      <select
        value={fit}
        onChange={(e) => setFit(e.target.value)}
        className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
      >
        <option value="preserve">Preserve</option>
        <option value="fill">Fill</option>
      </select>

      <button
        onClick={handleGeneratePrompt}
        disabled={loadingPrompt}
        className="w-full rounded-2xl bg-neutral-800 px-4 py-3 text-white disabled:opacity-50"
      >
        {loadingPrompt ? "Generating Motion Prompt..." : "Generate Motion Prompt"}
      </button>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Your generated motion prompt will appear here..."
        className="w-full min-h-[220px] rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
      />

      <button
        onClick={handleSavePrompt}
        disabled={savingPrompt}
        className="w-full rounded-2xl bg-neutral-800 px-4 py-3 text-white disabled:opacity-50"
      >
        {savingPrompt ? "Saving..." : "Save Prompt to Library"}
      </button>

      <button
        onClick={handleGenerateVideo}
        disabled={loadingVideo}
        className="w-full rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-50"
      >
        {loadingVideo ? "Generating Video..." : "Generate Video"}
      </button>

      {videoUrl && (
        <div className="rounded-2xl border border-neutral-300 bg-white p-4">
          <video
            src={videoUrl}
            controls
            className="w-full rounded-xl"
          />
        </div>
      )}
    </div>
  );
}

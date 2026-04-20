"use client";

import { useState } from "react";

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

export default function ImageMakerPage() {
  const [idea, setIdea] = useState("");
  const [styleHint, setStyleHint] = useState("");
  const [intensity, setIntensity] = useState<"subtle" | "balanced" | "dramatic">("balanced");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");

  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);

  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);

  async function handleGeneratePrompt() {
    try {
      if (idea.trim().length < 5) {
        alert("Please describe your idea first.");
        return;
      }

      setLoadingPrompt(true);

      const res = await fetch("/api/turn-thought-into-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          mode: "image",
          intensity,
          styleHint,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to generate prompt");
        return;
      }

      setPromptResult(data);
      setPrompt(data.finalPrompt || "");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoadingPrompt(false);
    }
  }

  async function handleSavePrompt() {
    try {
      if (!prompt) {
        alert("No prompt to save.");
        return;
      }

      setSavingPrompt(true);

      const res = await fetch("/api/save-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: promptResult?.title || "Image Prompt",
          idea,
          prompt,
          tool: "image-maker",
          metadata: {
            intensity,
            styleHint,
            size,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to save prompt");
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

  async function handleGenerateImage() {
    try {
      if (!prompt || prompt.length < 5) {
        alert("Prompt is required.");
        return;
      }

      setLoadingImage(true);
      setGeneratedImageUrl("");

      const res = await fetch("/api/image-maker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          size,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Image generation failed");
        return;
      }

      setGeneratedImageUrl(data?.url || "");
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoadingImage(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold text-white">Image Maker</h1>

      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Describe what you want to make..."
        className="w-full min-h-[120px] rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-white"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={styleHint}
          onChange={(e) => setStyleHint(e.target.value)}
          placeholder="Optional style hint"
          className="rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-white"
        />

        <select
          value={intensity}
          onChange={(e) => setIntensity(e.target.value as any)}
          className="rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-white"
        >
          <option value="subtle">Make it more subtle</option>
          <option value="balanced">Balanced</option>
          <option value="dramatic">Make it more dramatic</option>
        </select>

        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-white"
        >
          <option value="1024x1024">1024x1024</option>
          <option value="1024x1536">1024x1536</option>
          <option value="1536x1024">1536x1024</option>
        </select>
      </div>

      <button
        onClick={handleGeneratePrompt}
        disabled={loadingPrompt}
        className="w-full rounded-2xl bg-neutral-800 px-4 py-3 text-white disabled:opacity-50"
      >
        {loadingPrompt ? "Generating Prompt..." : "Generate Prompt"}
      </button>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Your prompt will appear here..."
        className="w-full min-h-[180px] rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-white"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={handleSavePrompt}
          disabled={savingPrompt}
          className="rounded-2xl bg-neutral-800 px-4 py-3 text-white disabled:opacity-50"
        >
          {savingPrompt ? "Saving..." : "Save Prompt to Library"}
        </button>

        <button
          onClick={handleGenerateImage}
          disabled={loadingImage}
          className="rounded-2xl bg-white px-4 py-3 text-black disabled:opacity-50"
        >
          {loadingImage ? "Generating Image..." : "Generate Image"}
        </button>
      </div>

      {generatedImageUrl && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <img
            src={generatedImageUrl}
            alt="Generated"
            className="w-full rounded-xl object-cover"
          />
        </div>
      )}
    </div>
  );
}
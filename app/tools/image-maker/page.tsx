"use client";

import { useEffect, useState } from "react";
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

const IMAGE_MODELS = [
  { value: "gpt-image-1", label: "GPT Image 1 (OpenAI) — supports reference images" },
  { value: "black-forest-labs/flux-pro", label: "Flux Pro (best quality)" },
  { value: "black-forest-labs/flux-schnell", label: "Flux Schnell (fastest)" },
  { value: "bytedance/seedream-4.5", label: "Seedream 4.5 (ByteDance)" },
  { value: "bytedance/seedream-4", label: "Seedream 4 (ByteDance)" },
  { value: "tencent/hunyuan-image-2.1", label: "Hunyuan Image 2.1 (2K)" },
  { value: "prunaai/wan-2.2-image", label: "Wan 2.2 Image (cinematic)" },
];

const OPENAI_SIZES = ["1024x1024", "1024x1536", "1536x1024"];
const REPLICATE_SIZES = ["1024x1024", "1024x1536", "1536x1024", "512x512"];

export default function ImageMakerPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [idea, setIdea] = useState("");
  const [styleHint, setStyleHint] = useState("");
  const [intensity, setIntensity] = useState<"subtle" | "balanced" | "dramatic">("balanced");
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("gpt-image-1");
  const [size, setSize] = useState("1024x1024");
  const [numOutputs, setNumOutputs] = useState(1);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);

  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);

  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOpenAI = modelId === "gpt-image-1";
  const availableSizes = isOpenAI ? OPENAI_SIZES : REPLICATE_SIZES;

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
    const saved = localStorage.getItem("zenavant_prompt");
    if (saved) {
      setIdea(saved);
      localStorage.removeItem("zenavant_prompt");
    }
  }, []);

  // Reset size when switching models if needed
  useEffect(() => {
    if (!availableSizes.includes(size)) {
      setSize("1024x1024");
    }
  }, [modelId]);

  async function handleGeneratePrompt() {
    if (idea.trim().length < 5) {
      alert("Please describe what you want to make first.");
      return;
    }

    setLoadingPrompt(true);
    try {
      const res = await fetch("/api/turn-thought-into-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, mode: "image", intensity, styleHint }),
      });

      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to generate prompt."); return; }

      setPromptResult(data);
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
          title: promptResult?.title || "Image Prompt",
          idea,
          prompt,
          tool: "image-maker",
          metadata: { styleHint, intensity, size, model: modelId },
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

  async function handleGenerateImage() {
    if (!prompt.trim()) { alert("Prompt is required."); return; }

    setLoadingImage(true);
    setGeneratedUrls([]);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("size", size);
      formData.append("modelId", modelId);
      formData.append("numOutputs", String(numOutputs));

      if (isOpenAI) {
        referenceImages.forEach((file) => {
          formData.append("referenceImages", file);
        });
      }

      const res = await fetch("/api/image-maker", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Image generation failed."); return; }

      if (data.urls) {
        setGeneratedUrls(data.urls);
      } else if (data.url) {
        setGeneratedUrls([data.url]);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoadingImage(false);
    }
  }

  if (checkingAuth) {
    return <div className="max-w-3xl mx-auto p-4 text-black">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4 text-black">
      <h1 className="text-2xl font-semibold">Image Maker</h1>
      <p className="text-neutral-600">Describe an image. Zenavant generates it.</p>

      <div className="rounded-2xl border border-neutral-300 bg-white p-4 space-y-4">

        {/* Idea */}
        <div>
          <label className="block font-semibold mb-2">Describe your idea</label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe what you want to make..."
            className="w-full min-h-[100px] rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
          />
        </div>

        {/* Style & Intensity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={styleHint}
            onChange={(e) => setStyleHint(e.target.value)}
            placeholder="Style hint (e.g., cinematic, Pixar, noir)"
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
          {loadingPrompt ? "Generating Prompt..." : "Generate Prompt"}
        </button>

        {/* Prompt */}
        <div>
          <label className="block font-semibold mb-2">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Your prompt will appear here, or type one directly..."
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
            {IMAGE_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Size & Outputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Size</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
            >
              {availableSizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Number of Outputs
            </label>
            <select
              value={numOutputs}
              onChange={(e) => setNumOutputs(Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
        </div>

        {/* Reference Images — OpenAI only */}
        {isOpenAI && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">
              Reference Images (optional — GPT Image 1 only)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setReferenceImages(Array.from(e.target.files || []))}
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-black"
            />
            {referenceImages.length > 0 && (
              <p className="text-xs text-neutral-500">
                {referenceImages.length} reference image(s) selected
              </p>
            )}
          </div>
        )}

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
            onClick={handleGenerateImage}
            disabled={loadingImage || !prompt.trim()}
            className="rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {loadingImage ? "Generating Image..." : "Generate Image"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {generatedUrls.length > 0 && (
        <section className="rounded-2xl border border-neutral-300 bg-white p-4">
          <h2 className="text-lg font-semibold mb-4">Results</h2>
          <div className={`grid gap-4 ${generatedUrls.length > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}>
            {generatedUrls.map((url, index) => (
              <div key={index}>
                <img
                  src={url}
                  alt={`Generated image ${index + 1}`}
                  className="w-full rounded-xl object-cover"
                />
                
                  href={url}
                  download
                  className="mt-2 inline-block text-sm text-black underline"
                >
                  Download image
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
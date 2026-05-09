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
const SEEDREAM_SIZES = ["1024x1024", "1280x720", "720x1280"];

export default function ImageMakerPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [idea, setIdea] = useState("");
  const [styleHint, setStyleHint] = useState("");
  const [intensity, setIntensity] = useState<"subtle" | "balanced" | "dramatic">("balanced");
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("black-forest-labs/flux-schnell");
  const [size, setSize] = useState("512x512");
  const [numOutputs, setNumOutputs] = useState(1);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOpenAI = modelId === "gpt-image-1";
  const isSeedream = modelId.includes("seedream");
  const availableSizes = isOpenAI ? OPENAI_SIZES : isSeedream ? SEEDREAM_SIZES : REPLICATE_SIZES

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
    if (saved) { setIdea(saved); localStorage.removeItem("zenavant_prompt"); }
  }, []);

  useEffect(() => {
  if (isSeedream) setSize("1024x1024");
  else if (!availableSizes.includes(size)) setSize("1024x1024");
}, [modelId]);

  async function handleGeneratePrompt() {
    if (idea.trim().length < 5) { alert("Please describe what you want to make first."); return; }
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
          idea, prompt, tool: "image-maker",
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
        referenceImages.forEach((file) => formData.append("referenceImages", file));
      }
      const res = await fetch("/api/image-maker", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Image generation failed."); return; }
      if (data.urls) setGeneratedUrls(data.urls);
      else if (data.url) setGeneratedUrls([data.url]);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoadingImage(false);
    }
  }

  if (checkingAuth) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F2" }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", color: "#C4714A" }}>Loading…</div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        .im-wrap { max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; font-family: 'DM Sans', sans-serif; color: #3A2A1E; }
        .im-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 4vw, 42px); font-weight: 300; color: #2C1F14; margin-bottom: 6px; }
        .im-title em { font-style: italic; color: #C4714A; }
        .im-sub { font-size: 15px; font-weight: 300; color: #6B4F38; margin-bottom: 32px; }
        .im-card { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 20px; padding: 32px; box-shadow: 0 2px 20px rgba(44,31,20,0.06); margin-bottom: 24px; }
        .im-label { display: block; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #6B4F38; margin-bottom: 8px; }
        .im-field { margin-bottom: 20px; }
        .im-textarea { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 15px; color: #2C1F14; outline: none; resize: vertical; transition: border-color 0.2s; box-sizing: border-box; }
        .im-textarea:focus { border-color: #C4714A; box-shadow: 0 0 0 3px rgba(196,113,74,0.1); }
        .im-textarea::placeholder { color: #9A7E68; font-weight: 300; }
        .im-input { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #2C1F14; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .im-input:focus { border-color: #C4714A; }
        .im-input::placeholder { color: #9A7E68; }
        .im-select { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #2C1F14; outline: none; cursor: pointer; box-sizing: border-box; }
        .im-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .im-btn { width: 100%; padding: 14px; border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .im-btn-primary { background: linear-gradient(135deg, #C4714A, #A85A36); color: white; box-shadow: 0 4px 16px rgba(196,113,74,0.3); }
        .im-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(196,113,74,0.4); }
        .im-btn-secondary { background: rgba(196,113,74,0.1); color: #A85A36; border: 1.5px solid rgba(196,113,74,0.2); }
        .im-btn-secondary:hover { background: rgba(196,113,74,0.15); }
        .im-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .im-btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
        .im-error { background: #FEF2EE; border: 1px solid #F0B8A0; color: #A85A36; border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-top: 12px; }
        .im-results { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 20px; padding: 32px; box-shadow: 0 2px 20px rgba(44,31,20,0.06); }
        .im-results-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 400; color: #2C1F14; margin-bottom: 20px; }
        .im-img-grid { display: grid; gap: 16px; }
        .im-img-grid.multi { grid-template-columns: 1fr 1fr; }
        .im-img { width: 100%; border-radius: 12px; object-fit: cover; }
        .im-download { display: inline-block; margin-top: 8px; font-size: 13px; color: #C4714A; text-decoration: underline; font-weight: 500; }
        .im-file-input { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px dashed #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #6B4F38; cursor: pointer; box-sizing: border-box; }
        @media (max-width: 640px) {
          .im-grid2 { grid-template-columns: 1fr; }
          .im-btn-row { grid-template-columns: 1fr; }
          .im-img-grid.multi { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="im-wrap">
        <h1 className="im-title">Image <em>Maker</em></h1>
        <p className="im-sub">Describe an image. Zenavant generates it.</p>

        <div className="im-card">
          {/* Idea */}
          <div className="im-field">
            <label className="im-label">Describe your idea</label>
            <textarea
              className="im-textarea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe what you want to make..."
              rows={4}
            />
          </div>

          {/* Style & Intensity */}
          <div className="im-grid2 im-field">
            <div>
              <label className="im-label">Style hint</label>
              <input
                className="im-input"
                value={styleHint}
                onChange={(e) => setStyleHint(e.target.value)}
                placeholder="e.g., cinematic, Pixar, noir"
              />
            </div>
            <div>
              <label className="im-label">Intensity</label>
              <select
                className="im-select"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value as "subtle" | "balanced" | "dramatic")}
              >
                <option value="subtle">Subtle</option>
                <option value="balanced">Balanced</option>
                <option value="dramatic">Dramatic</option>
              </select>
            </div>
          </div>

          {/* Generate Prompt */}
          <div className="im-field">
            <button className="im-btn im-btn-secondary" onClick={handleGeneratePrompt} disabled={loadingPrompt}>
              {loadingPrompt ? "Generating prompt…" : "Generate Prompt"}
            </button>
          </div>

          {/* Prompt */}
          <div className="im-field">
            <label className="im-label">Prompt</label>
            <textarea
              className="im-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Your prompt will appear here, or type one directly..."
              rows={5}
            />
          </div>

          {/* Model */}
          <div className="im-field">
            <label className="im-label">Model</label>
            <select className="im-select" value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {IMAGE_MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Size & Outputs */}
          <div className="im-grid2 im-field">
            <div>
              <label className="im-label">Size</label>
              <select className="im-select" value={size} onChange={(e) => setSize(e.target.value)}>
                {availableSizes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="im-label">Number of outputs</label>
              <select className="im-select" value={numOutputs} onChange={(e) => setNumOutputs(Number(e.target.value))}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
          </div>

          {/* Reference Images */}
          {isOpenAI && (
            <div className="im-field">
              <label className="im-label">Reference Images (optional — GPT Image 1 only)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="im-file-input"
                onChange={(e) => setReferenceImages(Array.from(e.target.files || []))}
              />
              {referenceImages.length > 0 && (
                <p style={{ fontSize: "12px", color: "#9A7E68", marginTop: "6px" }}>
                  {referenceImages.length} reference image(s) selected
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="im-btn-row">
            <button className="im-btn im-btn-secondary" onClick={handleSavePrompt} disabled={savingPrompt || !prompt.trim()}>
              {savingPrompt ? "Saving…" : "Save Prompt to Library"}
            </button>
            <button className="im-btn im-btn-primary" onClick={handleGenerateImage} disabled={loadingImage || !prompt.trim()}>
              {loadingImage ? "Generating…" : "Generate Image"}
            </button>
          </div>

          {error && <div className="im-error">{error}</div>}
        </div>

        {/* Results */}
        {generatedUrls.length > 0 && (
          <div className="im-results">
            <div className="im-results-title">Results</div>
            <div className={`im-img-grid${generatedUrls.length > 1 ? " multi" : ""}`}>
              {generatedUrls.map((url, index) => (
                <div key={index}>
                  <img src={url} alt={`Generated image ${index + 1}`} className="im-img" />
                  <a href={url} download className="im-download">
                    Download image
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
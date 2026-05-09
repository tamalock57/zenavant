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

  useEffect(() => { return () => stopPolling(); }, []);

  function stopPolling() {
    if (pollTimer.current) { window.clearInterval(pollTimer.current); pollTimer.current = null; }
  }

  async function handleGeneratePrompt() {
    if (idea.trim().length < 5) { alert("Please describe the motion you want first."); return; }
    setLoadingPrompt(true);
    try {
      const res = await fetch("/api/turn-thought-into-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, mode: "image-to-video", intensity, styleHint }),
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
        body: JSON.stringify({ title: "Image to Video Prompt", idea, prompt, tool: "image-to-video", metadata: { styleHint, intensity, seconds, size, model: modelId } }),
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
      const res = await fetch(`/api/image-to-video?id=${encodeURIComponent(id)}&prompt=${encodeURIComponent(prompt)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.status === "completed") {
        setJobStatus("completed"); setVideoUrl(data.downloadUrl); setLoading(false); stopPolling();
      } else if (data.status === "failed") {
        setJobStatus("failed"); setError(data.error || "Generation failed"); setLoading(false); stopPolling();
      } else {
        setJobStatus(data.status === "in_progress" ? "in_progress" : "queued");
      }
    } catch (err) { console.error(err); }
  }

  async function handleGenerateVideo() {
    if (!imageFile) { alert("Please upload an image first."); return; }
    if (!prompt.trim()) { alert("Please add a prompt first."); return; }
    stopPolling();
    setLoading(true); setError(null); setVideoUrl(null); setJobStatus(null);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("prompt", prompt);
      formData.append("modelId", modelId);
      formData.append("seconds", seconds);
      formData.append("size", size);
      const res = await fetch("/api/image-to-video", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to start video generation."); setLoading(false); return; }
      setJobStatus("queued");
      pollTimer.current = window.setInterval(() => pollStatus(data.id), 3000) as unknown as number;
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong"); setLoading(false);
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
        .i2v-wrap { max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; font-family: 'DM Sans', sans-serif; color: #3A2A1E; }
        .i2v-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 4vw, 42px); font-weight: 300; color: #2C1F14; margin-bottom: 6px; }
        .i2v-title em { font-style: italic; color: #C4714A; }
        .i2v-sub { font-size: 15px; font-weight: 300; color: #6B4F38; margin-bottom: 32px; }
        .i2v-card { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 20px; padding: 32px; box-shadow: 0 2px 20px rgba(44,31,20,0.06); margin-bottom: 24px; }
        .i2v-label { display: block; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #6B4F38; margin-bottom: 8px; }
        .i2v-field { margin-bottom: 20px; }
        .i2v-textarea { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 15px; color: #2C1F14; outline: none; resize: vertical; transition: border-color 0.2s; box-sizing: border-box; }
        .i2v-textarea:focus { border-color: #C4714A; box-shadow: 0 0 0 3px rgba(196,113,74,0.1); }
        .i2v-textarea::placeholder { color: #9A7E68; font-weight: 300; }
        .i2v-input { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #2C1F14; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .i2v-input::placeholder { color: #9A7E68; }
        .i2v-select { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #2C1F14; outline: none; cursor: pointer; box-sizing: border-box; }
        .i2v-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .i2v-btn { width: 100%; padding: 14px; border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .i2v-btn-primary { background: linear-gradient(135deg, #C4714A, #A85A36); color: white; box-shadow: 0 4px 16px rgba(196,113,74,0.3); }
        .i2v-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(196,113,74,0.4); }
        .i2v-btn-secondary { background: rgba(196,113,74,0.1); color: #A85A36; border: 1.5px solid rgba(196,113,74,0.2); }
        .i2v-btn-secondary:hover { background: rgba(196,113,74,0.15); }
        .i2v-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .i2v-btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .i2v-error { background: #FEF2EE; border: 1px solid #F0B8A0; color: #A85A36; border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-top: 12px; }
        .i2v-status { background: rgba(196,113,74,0.06); border: 1px solid rgba(196,113,74,0.15); border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #6B4F38; margin-top: 12px; }
        .i2v-notice { font-size: 13px; color: #9A7E68; margin-top: 12px; }
        .i2v-preview { border-radius: 12px; overflow: hidden; border: 1px solid rgba(196,113,74,0.15); margin-bottom: 20px; }
        .i2v-preview img { width: 100%; object-fit: cover; max-height: 280px; display: block; }
        .i2v-file { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px dashed #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #6B4F38; cursor: pointer; box-sizing: border-box; }
        .i2v-results { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 20px; padding: 32px; box-shadow: 0 2px 20px rgba(44,31,20,0.06); }
        .i2v-results-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 400; color: #2C1F14; margin-bottom: 20px; }
        .i2v-video { width: 100%; border-radius: 12px; }
        .i2v-download { display: inline-block; margin-top: 8px; font-size: 13px; color: #C4714A; text-decoration: underline; font-weight: 500; }
        @media (max-width: 640px) {
          .i2v-grid2 { grid-template-columns: 1fr; }
          .i2v-btn-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="i2v-wrap">
        <h1 className="i2v-title">Image <em>to Video</em></h1>
        <p className="i2v-sub">Upload an image and bring it to life.</p>

        <div className="i2v-card">
          <div className="i2v-field">
            <label className="i2v-label">Upload Image</label>
            <input type="file" accept="image/*" className="i2v-file" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          </div>

          {previewUrl && (
            <div className="i2v-preview">
              <img src={previewUrl} alt="Preview" />
            </div>
          )}

          <div className="i2v-field">
            <label className="i2v-label">Describe the motion</label>
            <textarea className="i2v-textarea" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Describe what you want the image to do..." rows={4} />
          </div>

          <div className="i2v-grid2 i2v-field">
            <div>
              <label className="i2v-label">Style hint</label>
              <input className="i2v-input" value={styleHint} onChange={(e) => setStyleHint(e.target.value)} placeholder="e.g., cinematic, realistic" />
            </div>
            <div>
              <label className="i2v-label">Intensity</label>
              <select className="i2v-select" value={intensity} onChange={(e) => setIntensity(e.target.value as "subtle" | "balanced" | "dramatic")}>
                <option value="subtle">Subtle</option>
                <option value="balanced">Balanced</option>
                <option value="dramatic">Dramatic</option>
              </select>
            </div>
          </div>

          <div className="i2v-field">
            <button className="i2v-btn i2v-btn-secondary" onClick={handleGeneratePrompt} disabled={loadingPrompt}>
              {loadingPrompt ? "Generating prompt…" : "Generate Motion Prompt"}
            </button>
          </div>

          <div className="i2v-field">
            <label className="i2v-label">Motion Prompt</label>
            <textarea className="i2v-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Your motion prompt will appear here, or type one directly..." rows={5} />
          </div>

          <div className="i2v-field">
            <label className="i2v-label">Model</label>
            <select className="i2v-select" value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {I2V_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="i2v-grid2 i2v-field">
            <div>
              <label className="i2v-label">Size</label>
              <select className="i2v-select" value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="1280x720">1280×720 (Landscape)</option>
                <option value="720x1280">720×1280 (Portrait)</option>
                <option value="1024x1024">1024×1024 (Square)</option>
              </select>
            </div>
            <div>
              <label className="i2v-label">Duration</label>
              <select className="i2v-select" value={seconds} onChange={(e) => setSeconds(e.target.value)}>
                <option value="4">4 seconds</option>
                <option value="5">5 seconds</option>
                <option value="8">8 seconds</option>
                <option value="10">10 seconds</option>
              </select>
            </div>
          </div>

          <div className="i2v-btn-row">
            <button className="i2v-btn i2v-btn-secondary" onClick={handleSavePrompt} disabled={savingPrompt || !prompt.trim()}>
              {savingPrompt ? "Saving…" : "Save Prompt to Library"}
            </button>
            <button className="i2v-btn i2v-btn-primary" onClick={handleGenerateVideo} disabled={loading || !prompt.trim() || !imageFile}>
              {loading ? "Generating…" : "Generate Video"}
            </button>
          </div>

          {jobStatus && jobStatus !== "completed" && (
            <div className="i2v-status">Status: {jobStatus}</div>
          )}

          {error && <div className="i2v-error">{error}</div>}
          <p className="i2v-notice">Keep this page open while generating.</p>
        </div>

        {videoUrl && (
          <div className="i2v-results">
            <div className="i2v-results-title">Result</div>
            <video controls src={videoUrl} className="i2v-video" />
            <a href={videoUrl} download className="i2v-download">Download video</a>
          </div>
        )}
      </div>
    </>
  );
}
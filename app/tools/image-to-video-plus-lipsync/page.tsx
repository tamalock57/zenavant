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

  useEffect(() => { return () => { stopPolling(); stopLipPolling(); }; }, []);

  function stopPolling() {
    if (pollTimer.current) { window.clearInterval(pollTimer.current); pollTimer.current = null; }
  }
  function stopLipPolling() {
    if (lipTimer.current) { window.clearInterval(lipTimer.current); lipTimer.current = null; }
  }

  async function pollVideo(id: string) {
    try {
      const res = await fetch(`/api/image-to-video?id=${encodeURIComponent(id)}&prompt=${encodeURIComponent(prompt)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.status === "completed") {
        setJobStatus("completed"); setVideoUrl(data.downloadUrl); setLoading(false); stopPolling();
      } else if (data.status === "failed") {
        setJobStatus("failed"); setError(data.error || "Video generation failed"); setLoading(false); stopPolling();
      } else {
        setJobStatus(data.status === "in_progress" ? "in_progress" : "queued");
      }
    } catch (err) { console.error(err); }
  }

  async function generateVideo() {
    if (!imageFile) { alert("Please upload an image first."); return; }
    if (!prompt.trim()) { alert("Please add a prompt first."); return; }
    stopPolling();
    setLoading(true); setError(null); setVideoUrl(null); setJobStatus(null); setLipVideoUrl(null); setLipStatus(null);
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
      pollTimer.current = window.setInterval(() => pollVideo(data.id), 3000) as unknown as number;
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong"); setLoading(false);
    }
  }

  async function pollLipSync(id: string) {
    try {
      const res = await fetch(`/api/lipsync?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.status === "completed") {
        setLipStatus("completed"); setLipVideoUrl(data.downloadUrl); setLipLoading(false); stopLipPolling();
      } else if (data.status === "failed") {
        setLipStatus("failed"); setError(data.error || "Lip sync failed"); setLipLoading(false); stopLipPolling();
      } else {
        setLipStatus(data.status === "processing" ? "processing" : "starting");
      }
    } catch (err) { console.error(err); }
  }

  async function runLipSync() {
    if (!videoUrl) { alert("Generate a video first in Step 1."); return; }
    if (lipMode === "audio" && !audioFile) { alert("Please upload an audio file."); return; }
    if (lipMode === "text" && !lipText.trim()) { alert("Please enter text for lip sync."); return; }
    stopLipPolling();
    setLipLoading(true); setLipStatus(null); setLipVideoUrl(null); setError(null);
    try {
      const fd = new FormData();
      fd.append("videoUrl", videoUrl);
      fd.append("mode", lipMode);
      if (lipMode === "audio" && audioFile) fd.append("audio", audioFile);
      if (lipMode === "text") fd.append("text", lipText);
      const res = await fetch("/api/lipsync", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Lip sync failed"); setLipLoading(false); return; }
      setLipStatus("starting");
      lipTimer.current = window.setInterval(() => pollLipSync(data.id), 3000) as unknown as number;
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong"); setLipLoading(false);
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
        .ls-wrap { max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; font-family: 'DM Sans', sans-serif; color: #3A2A1E; }
        .ls-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 4vw, 42px); font-weight: 300; color: #2C1F14; margin-bottom: 6px; }
        .ls-title em { font-style: italic; color: #C4714A; }
        .ls-sub { font-size: 15px; font-weight: 300; color: #6B4F38; margin-bottom: 32px; }
        .ls-card { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 20px; padding: 32px; box-shadow: 0 2px 20px rgba(44,31,20,0.06); margin-bottom: 24px; }
        .ls-card-locked { background: rgba(250,247,242,0.5); border: 1px solid rgba(196,113,74,0.08); border-radius: 20px; padding: 32px; box-shadow: none; margin-bottom: 24px; opacity: 0.6; pointer-events: none; }
        .ls-step { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; color: #C4714A; margin-bottom: 4px; letter-spacing: 0.02em; }
        .ls-step-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 300; color: #2C1F14; margin-bottom: 20px; }
        .ls-label { display: block; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #6B4F38; margin-bottom: 8px; }
        .ls-field { margin-bottom: 20px; }
        .ls-textarea { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 15px; color: #2C1F14; outline: none; resize: vertical; transition: border-color 0.2s; box-sizing: border-box; }
        .ls-textarea:focus { border-color: #C4714A; box-shadow: 0 0 0 3px rgba(196,113,74,0.1); }
        .ls-textarea::placeholder { color: #9A7E68; font-weight: 300; }
        .ls-select { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #2C1F14; outline: none; cursor: pointer; box-sizing: border-box; }
        .ls-file { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px dashed #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #6B4F38; cursor: pointer; box-sizing: border-box; }
        .ls-file-name { font-size: 12px; color: #9A7E68; margin-top: 6px; }
        .ls-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .ls-btn { width: 100%; padding: 14px; border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .ls-btn-primary { background: linear-gradient(135deg, #C4714A, #A85A36); color: white; box-shadow: 0 4px 16px rgba(196,113,74,0.3); }
        .ls-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(196,113,74,0.4); }
        .ls-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .ls-status { background: rgba(196,113,74,0.06); border: 1px solid rgba(196,113,74,0.15); border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #6B4F38; margin-top: 12px; }
        .ls-success { background: rgba(100,180,100,0.08); border: 1px solid rgba(100,180,100,0.2); border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #3A6B2E; margin-bottom: 12px; }
        .ls-error { background: #FEF2EE; border: 1px solid #F0B8A0; color: #A85A36; border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-top: 12px; }
        .ls-video { width: 100%; border-radius: 12px; margin-top: 12px; }
        .ls-download { display: inline-block; margin-top: 8px; font-size: 13px; color: #C4714A; text-decoration: underline; font-weight: 500; }
        @media (max-width: 640px) { .ls-grid2 { grid-template-columns: 1fr; } }
      `}</style>

      <div className="ls-wrap">
        <h1 className="ls-title">Lip <em>Sync</em></h1>
        <p className="ls-sub">Generate a video from an image, then sync it to audio or text.</p>

        {/* Step 1 */}
        <div className="ls-card">
          <div className="ls-step">Step 01</div>
          <div className="ls-step-title">Generate Video</div>

          <div className="ls-field">
            <label className="ls-label">Upload Image</label>
            <input type="file" accept="image/*" className="ls-file" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            {imageFile && <p className="ls-file-name">{imageFile.name}</p>}
          </div>

          <div className="ls-field">
            <label className="ls-label">Prompt</label>
            <textarea className="ls-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Talking head, natural speaking motion, subtle camera push-in..." rows={4} />
          </div>

          <div className="ls-field">
            <label className="ls-label">Model</label>
            <select className="ls-select" value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {I2V_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="ls-grid2 ls-field">
            <div>
              <label className="ls-label">Size</label>
              <select className="ls-select" value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="1280x720">1280×720 (Landscape)</option>
                <option value="720x1280">720×1280 (Portrait)</option>
                <option value="1024x1024">1024×1024 (Square)</option>
              </select>
            </div>
            <div>
              <label className="ls-label">Duration</label>
              <select className="ls-select" value={seconds} onChange={(e) => setSeconds(e.target.value)}>
                <option value="4">4 seconds</option>
                <option value="5">5 seconds</option>
                <option value="8">8 seconds</option>
                <option value="10">10 seconds</option>
              </select>
            </div>
          </div>

          <button className="ls-btn ls-btn-primary" onClick={generateVideo} disabled={loading || !imageFile || !prompt.trim()}>
            {loading ? "Generating…" : "Generate Video"}
          </button>

          {jobStatus && jobStatus !== "completed" && (
            <div className="ls-status">Status: {jobStatus}</div>
          )}

          {videoUrl && (
            <div style={{ marginTop: "16px" }}>
              <div className="ls-success">Video ready — proceed to Step 2!</div>
              <video controls src={videoUrl} className="ls-video" />
            </div>
          )}
        </div>

        {/* Step 2 */}
        <div className={videoUrl ? "ls-card" : "ls-card-locked"}>
          <div className="ls-step">Step 02</div>
          <div className="ls-step-title">Lip Sync</div>

          {!videoUrl && <p style={{ fontSize: "14px", color: "#9A7E68", marginBottom: "16px" }}>Complete Step 1 first to enable lip sync.</p>}

          <div className="ls-field">
            <label className="ls-label">Lip Sync Mode</label>
            <select className="ls-select" value={lipMode} onChange={(e) => setLipMode(e.target.value as LipMode)}>
              <option value="audio">Audio File</option>
              <option value="text">Text to Speech</option>
            </select>
          </div>

          {lipMode === "audio" && (
            <div className="ls-field">
              <label className="ls-label">Upload Audio</label>
              <input type="file" accept="audio/*" className="ls-file" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
              {audioFile && <p className="ls-file-name">{audioFile.name}</p>}
            </div>
          )}

          {lipMode === "text" && (
            <div className="ls-field">
              <label className="ls-label">Text to Speak</label>
              <textarea className="ls-textarea" value={lipText} onChange={(e) => setLipText(e.target.value)} placeholder="Enter the text you want the person to say..." rows={4} />
            </div>
          )}

          <button className="ls-btn ls-btn-primary" onClick={runLipSync} disabled={lipLoading || !videoUrl}>
            {lipLoading ? "Running Lip Sync…" : "Run Lip Sync"}
          </button>

          {lipStatus && lipStatus !== "completed" && (
            <div className="ls-status">Status: {lipStatus}</div>
          )}

          {lipVideoUrl && (
            <div style={{ marginTop: "16px" }}>
              <div className="ls-success">Lip sync complete!</div>
              <video controls src={lipVideoUrl} className="ls-video" />
              <a href={lipVideoUrl} download className="ls-download">Download lip-synced video</a>
            </div>
          )}
        </div>

        {error && <div className="ls-error">{error}</div>}
      </div>
    </>
  );
}
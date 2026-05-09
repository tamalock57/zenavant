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
    if (saved) { setIdea(saved); setPrompt(saved); localStorage.removeItem("zenavant_prompt"); }
  }, []);

  useEffect(() => { return () => stopPolling(); }, []);

  function stopPolling() {
    if (pollTimer.current) { window.clearInterval(pollTimer.current); pollTimer.current = null; }
  }

  async function handleGeneratePrompt() {
    if (idea.trim().length < 5) { alert("Please describe your video idea first."); return; }
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
    const res = await fetch(`/api/video-maker?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const text = await res.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text || "Invalid response" }; }
    if (!res.ok) throw new Error(data?.error || "Status check failed");
    return data;
  }

  async function pollAll(ids: string[]) {
    try {
      const all = await Promise.all(ids.map(async (id) => {
        const data = await pollOne(id);
        return {
          jobId: id,
          status: (data.status ?? null) as JobStatus | null,
          progress: typeof data.progress === "number" ? data.progress : 0,
          videoUrl: data.downloadUrl || null,
          error: data.status === "failed" ? data.error || "Video failed" : null,
        } satisfies VideoResult;
      }));
      setResults(all);
      const allFinished = all.length > 0 && all.every((i) => i.status === "completed" || i.status === "failed");
      if (all.some((i) => i.status === "failed")) setError(all.find((i) => i.error)?.error || "One or more videos failed");
      if (allFinished) { stopPolling(); setLoading(false); }
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
    setResults([]);
    try {
      const res = await fetch("/api/video-maker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, modelId, size, seconds, numOutputs }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text || "Invalid response" }; }
      if (!res.ok) { setError(data?.error || "Request failed"); setLoading(false); return; }
      const ids: string[] = Array.isArray(data?.ids) ? data.ids : data?.id ? [data.id] : [];
      if (ids.length === 0) { setError("No job IDs returned"); setLoading(false); return; }
      setResults(ids.map((id) => ({ jobId: id, status: (data.status ?? "queued") as JobStatus, progress: 0, videoUrl: null, error: null })));
      pollTimer.current = window.setInterval(() => pollAll(ids), 3000) as unknown as number;
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setLoading(false);
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
        .vm-wrap { max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; font-family: 'DM Sans', sans-serif; color: #3A2A1E; }
        .vm-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 4vw, 42px); font-weight: 300; color: #2C1F14; margin-bottom: 6px; }
        .vm-title em { font-style: italic; color: #C4714A; }
        .vm-sub { font-size: 15px; font-weight: 300; color: #6B4F38; margin-bottom: 32px; }
        .vm-card { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 20px; padding: 32px; box-shadow: 0 2px 20px rgba(44,31,20,0.06); margin-bottom: 24px; }
        .vm-label { display: block; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #6B4F38; margin-bottom: 8px; }
        .vm-field { margin-bottom: 20px; }
        .vm-textarea { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 15px; color: #2C1F14; outline: none; resize: vertical; transition: border-color 0.2s; box-sizing: border-box; }
        .vm-textarea:focus { border-color: #C4714A; box-shadow: 0 0 0 3px rgba(196,113,74,0.1); }
        .vm-textarea::placeholder { color: #9A7E68; font-weight: 300; }
        .vm-input { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #2C1F14; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .vm-input::placeholder { color: #9A7E68; }
        .vm-select { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #2C1F14; outline: none; cursor: pointer; box-sizing: border-box; }
        .vm-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .vm-btn { width: 100%; padding: 14px; border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .vm-btn-primary { background: linear-gradient(135deg, #C4714A, #A85A36); color: white; box-shadow: 0 4px 16px rgba(196,113,74,0.3); }
        .vm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(196,113,74,0.4); }
        .vm-btn-secondary { background: rgba(196,113,74,0.1); color: #A85A36; border: 1.5px solid rgba(196,113,74,0.2); }
        .vm-btn-secondary:hover { background: rgba(196,113,74,0.15); }
        .vm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .vm-error { background: #FEF2EE; border: 1px solid #F0B8A0; color: #A85A36; border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-top: 12px; }
        .vm-notice { font-size: 13px; color: #9A7E68; margin-top: 8px; }
        .vm-status-card { background: rgba(255,255,255,0.6); border: 1px solid rgba(196,113,74,0.1); border-radius: 12px; padding: 14px; margin-bottom: 8px; }
        .vm-status-label { font-size: 13px; font-weight: 500; color: #2C1F14; margin-bottom: 4px; }
        .vm-status-val { font-size: 13px; color: #6B4F38; }
        .vm-results { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 20px; padding: 32px; box-shadow: 0 2px 20px rgba(44,31,20,0.06); }
        .vm-results-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 400; color: #2C1F14; margin-bottom: 20px; }
        .vm-video { width: 100%; border-radius: 12px; }
        .vm-download { display: inline-block; margin-top: 8px; font-size: 13px; color: #C4714A; text-decoration: underline; font-weight: 500; }
        .vm-output-label { font-size: 12px; color: #9A7E68; margin-top: 6px; }
        @media (max-width: 640px) {
          .vm-grid2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="vm-wrap">
        <h1 className="vm-title">Video <em>Maker</em></h1>
        <p className="vm-sub">Describe a short video. Zenavant generates it.</p>

        <div className="vm-card">
          <div className="vm-field">
            <label className="vm-label">Describe your idea</label>
            <textarea className="vm-textarea" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Describe the video you want to make..." rows={4} />
          </div>

          <div className="vm-grid2 vm-field">
            <div>
              <label className="vm-label">Style hint</label>
              <input className="vm-input" value={styleHint} onChange={(e) => setStyleHint(e.target.value)} placeholder="e.g., cinematic, noir" />
            </div>
            <div>
              <label className="vm-label">Intensity</label>
              <select className="vm-select" value={intensity} onChange={(e) => setIntensity(e.target.value as "subtle" | "balanced" | "dramatic")}>
                <option value="subtle">Subtle</option>
                <option value="balanced">Balanced</option>
                <option value="dramatic">Dramatic</option>
              </select>
            </div>
          </div>

          <div className="vm-field">
            <button className="vm-btn vm-btn-secondary" onClick={handleGeneratePrompt} disabled={loadingPrompt}>
              {loadingPrompt ? "Generating prompt…" : "Generate Prompt"}
            </button>
          </div>

          <div className="vm-field">
            <label className="vm-label">Prompt</label>
            <textarea className="vm-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Your video prompt will appear here, or type one directly..." rows={5} />
          </div>

          <div className="vm-field">
            <label className="vm-label">Model</label>
            <select className="vm-select" value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {VIDEO_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="vm-grid2 vm-field">
            <div>
              <label className="vm-label">Size</label>
              <select className="vm-select" value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="1280x720">1280×720 (Landscape)</option>
                <option value="720x1280">720×1280 (Portrait)</option>
                <option value="1024x1024">1024×1024 (Square)</option>
              </select>
            </div>
            <div>
              <label className="vm-label">Duration</label>
              <select className="vm-select" value={seconds} onChange={(e) => setSeconds(e.target.value)}>
                <option value="4">4 seconds</option>
                <option value="5">5 seconds</option>
                <option value="8">8 seconds</option>
                <option value="10">10 seconds</option>
              </select>
            </div>
          </div>

          <div className="vm-field">
            <label className="vm-label">Number of outputs</label>
            <select className="vm-select" value={numOutputs} onChange={(e) => setNumOutputs(Number(e.target.value))}>
              <option value={1}>1 (Fastest)</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>

          <button className="vm-btn vm-btn-primary" onClick={generate} disabled={loading || !canSubmit}>
            {loading ? "Generating…" : "Generate Video"}
          </button>

          <p className="vm-notice">Keep this page open while generating. Closing or refreshing may interrupt progress.</p>

          {results.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              {results.map((item, index) => (
                <div key={item.jobId} className="vm-status-card">
                  <div className="vm-status-label">Output {index + 1}</div>
                  <div className="vm-status-val">Status: {item.status ?? "—"}</div>
                  {item.error && <div style={{ color: "#A85A36", fontSize: "13px", marginTop: "4px" }}>{item.error}</div>}
                </div>
              ))}
            </div>
          )}

          {error && <div className="vm-error">{error}</div>}
        </div>

        {results.some((item) => item.videoUrl) && (
          <div className="vm-results">
            <div className="vm-results-title">Results</div>
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: results.filter((i) => i.videoUrl).length > 1 ? "1fr 1fr" : "1fr" }}>
              {results.map((item, index) =>
                item.videoUrl ? (
                  <div key={`${item.jobId}-${index}`}>
                    <video controls src={item.videoUrl} className="vm-video" />
                    <div className="vm-output-label">Output {index + 1}</div>
                    <a href={item.videoUrl} download className="vm-download">Download video</a>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
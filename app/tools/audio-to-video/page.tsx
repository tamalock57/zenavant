"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type JobStatus = "queued" | "in_progress" | "completed" | "failed";
type Mode = "native-audio" | "audio-to-video" | "audio-image-to-video";

const MODES = [
  { value: "native-audio", label: "Generate Video with Native Audio", description: "Text prompt only — generates a video with natural sound included" },
  { value: "audio-to-video", label: "Generate Video from Audio File", description: "Upload an audio file — generates visuals that match the audio" },
  { value: "audio-image-to-video", label: "Animate Image with Audio", description: "Upload an audio file and an image — animates the image to match the audio" },
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

  useEffect(() => { return () => stopPolling(); }, []);

  function stopPolling() {
    if (pollTimer.current) { window.clearInterval(pollTimer.current); pollTimer.current = null; }
  }

  async function pollStatus(id: string) {
    try {
      const res = await fetch(`/api/audio-to-video?id=${encodeURIComponent(id)}&prompt=${encodeURIComponent(prompt)}`, { cache: "no-store" });
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

  async function generate() {
    if (!prompt.trim()) { alert("Please add a prompt first."); return; }
    if (mode !== "native-audio" && !audioFile) { alert("Please upload an audio file."); return; }
    if (mode === "audio-image-to-video" && !imageFile) { alert("Please upload an image file."); return; }
    stopPolling();
    setLoading(true); setError(null); setVideoUrl(null); setJobStatus(null);
    try {
      const fd = new FormData();
      fd.append("mode", mode);
      fd.append("prompt", prompt);
      fd.append("seconds", seconds);
      if (audioFile) fd.append("audio", audioFile);
      if (imageFile) fd.append("image", imageFile);
      const res = await fetch("/api/audio-to-video", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Generation failed"); setLoading(false); return; }
      setJobStatus("queued");
      pollTimer.current = window.setInterval(() => pollStatus(data.id), 3000) as unknown as number;
    } catch (e: any) {
      setError(e?.message || "Something went wrong"); setLoading(false);
    }
  }

  if (checkingAuth) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F2" }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", color: "#C4714A" }}>Loading…</div>
    </div>
  );

  const selectedMode = MODES.find((m) => m.value === mode);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        .a2v-wrap { max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; font-family: 'DM Sans', sans-serif; color: #3A2A1E; }
        .a2v-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 4vw, 42px); font-weight: 300; color: #2C1F14; margin-bottom: 6px; }
        .a2v-title em { font-style: italic; color: #C4714A; }
        .a2v-sub { font-size: 15px; font-weight: 300; color: #6B4F38; margin-bottom: 32px; }
        .a2v-card { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 20px; padding: 32px; box-shadow: 0 2px 20px rgba(44,31,20,0.06); margin-bottom: 24px; }
        .a2v-label { display: block; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #6B4F38; margin-bottom: 8px; }
        .a2v-field { margin-bottom: 20px; }
        .a2v-mode-desc { font-size: 13px; color: #9A7E68; margin-top: 6px; }
        .a2v-textarea { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 15px; color: #2C1F14; outline: none; resize: vertical; transition: border-color 0.2s; box-sizing: border-box; }
        .a2v-textarea:focus { border-color: #C4714A; box-shadow: 0 0 0 3px rgba(196,113,74,0.1); }
        .a2v-textarea::placeholder { color: #9A7E68; font-weight: 300; }
        .a2v-select { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #2C1F14; outline: none; cursor: pointer; box-sizing: border-box; }
        .a2v-file { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px dashed #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #6B4F38; cursor: pointer; box-sizing: border-box; }
        .a2v-file-name { font-size: 12px; color: #9A7E68; margin-top: 6px; }
        .a2v-btn { width: 100%; padding: 14px; border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .a2v-btn-primary { background: linear-gradient(135deg, #C4714A, #A85A36); color: white; box-shadow: 0 4px 16px rgba(196,113,74,0.3); }
        .a2v-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(196,113,74,0.4); }
        .a2v-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .a2v-notice { font-size: 13px; color: #9A7E68; margin-top: 12px; }
        .a2v-status { background: rgba(196,113,74,0.06); border: 1px solid rgba(196,113,74,0.15); border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #6B4F38; margin-top: 12px; }
        .a2v-error { background: #FEF2EE; border: 1px solid #F0B8A0; color: #A85A36; border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-top: 12px; }
        .a2v-results { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 20px; padding: 32px; box-shadow: 0 2px 20px rgba(44,31,20,0.06); }
        .a2v-results-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 400; color: #2C1F14; margin-bottom: 20px; }
        .a2v-video { width: 100%; border-radius: 12px; }
        .a2v-download { display: inline-block; margin-top: 8px; font-size: 13px; color: #C4714A; text-decoration: underline; font-weight: 500; }
      `}</style>

      <div className="a2v-wrap">
        <h1 className="a2v-title">Audio <em>to Video</em></h1>
        <p className="a2v-sub">Generate videos with audio, from audio, or animate images with sound.</p>

        <div className="a2v-card">
          <div className="a2v-field">
            <label className="a2v-label">Mode</label>
            <select className="a2v-select" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {selectedMode && <p className="a2v-mode-desc">{selectedMode.description}</p>}
          </div>

          {(mode === "audio-to-video" || mode === "audio-image-to-video") && (
            <div className="a2v-field">
              <label className="a2v-label">Upload Audio</label>
              <input type="file" accept=".mp3,.wav,.mp4,.m4a" className="a2v-file" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
              {audioFile && <p className="a2v-file-name">{audioFile.name}</p>}
            </div>
          )}

          {mode === "audio-image-to-video" && (
            <div className="a2v-field">
              <label className="a2v-label">Upload Image</label>
              <input type="file" accept="image/*" className="a2v-file" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
              {imageFile && <p className="a2v-file-name">{imageFile.name}</p>}
            </div>
          )}

          <div className="a2v-field">
            <label className="a2v-label">{mode === "native-audio" ? "Describe the video and audio" : "Describe the visuals"}</label>
            <textarea
              className="a2v-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === "native-audio" ? "A calm rainy street at night with soft jazz playing..." : "Describe what the visuals should look like..."}
              rows={4}
            />
          </div>

          <div className="a2v-field">
            <label className="a2v-label">Duration</label>
            <select className="a2v-select" value={seconds} onChange={(e) => setSeconds(e.target.value)}>
              <option value="4">4 seconds</option>
              <option value="5">5 seconds</option>
              <option value="8">8 seconds</option>
              <option value="10">10 seconds</option>
            </select>
          </div>

          <button className="a2v-btn a2v-btn-primary" onClick={generate} disabled={loading}>
            {loading ? "Generating…" : "Generate Video"}
          </button>

          <p className="a2v-notice">Keep this page open while generating.</p>

          {jobStatus && jobStatus !== "completed" && (
            <div className="a2v-status">Status: {jobStatus}</div>
          )}

          {error && <div className="a2v-error">{error}</div>}
        </div>

        {videoUrl && (
          <div className="a2v-results">
            <div className="a2v-results-title">Result</div>
            <video controls src={videoUrl} className="a2v-video" />
            <a href={videoUrl} download className="a2v-download">Download video</a>
          </div>
        )}
      </div>
    </>
  );
}

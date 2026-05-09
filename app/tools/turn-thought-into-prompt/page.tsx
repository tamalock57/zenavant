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

export default function TurnThoughtIntoPromptPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [idea, setIdea] = useState("");
  const [mode, setMode] = useState<"image" | "image-to-video" | "video">("image");
  const [intensity, setIntensity] = useState<"subtle" | "balanced" | "dramatic">("balanced");
  const [styleHint, setStyleHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<PromptResult | null>(null);

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

  async function handleGenerate() {
    if (idea.trim().length < 5) { alert("Please describe the idea first."); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/turn-thought-into-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, mode, intensity, styleHint }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to build prompt."); return; }
      setResult(data);
    } catch (err) {
      console.error(err); alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePrompt() {
    if (!result?.finalPrompt) { alert("Generate a prompt first."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/save-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.title || "Prompt",
          idea, prompt: result.finalPrompt, tool: "turn-thought-into-prompt",
          metadata: { mode, intensity, styleHint, summary: result.summary, subject: result.subject, setting: result.setting, action: result.action, emotion: result.emotion, camera: result.camera, style: result.style, rules: result.rules },
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to save prompt."); return; }
      alert("Prompt saved to Library.");
    } catch (err) {
      console.error(err); alert("Failed to save prompt.");
    } finally {
      setSaving(false);
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
        .ttp-wrap { max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; font-family: 'DM Sans', sans-serif; color: #3A2A1E; }
        .ttp-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 4vw, 42px); font-weight: 300; color: #2C1F14; margin-bottom: 6px; }
        .ttp-title em { font-style: italic; color: #C4714A; }
        .ttp-sub { font-size: 15px; font-weight: 300; color: #6B4F38; margin-bottom: 32px; }
        .ttp-card { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 20px; padding: 32px; box-shadow: 0 2px 20px rgba(44,31,20,0.06); margin-bottom: 24px; }
        .ttp-label { display: block; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #6B4F38; margin-bottom: 8px; }
        .ttp-field { margin-bottom: 20px; }
        .ttp-textarea { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 15px; color: #2C1F14; outline: none; resize: vertical; transition: border-color 0.2s; box-sizing: border-box; }
        .ttp-textarea:focus { border-color: #C4714A; box-shadow: 0 0 0 3px rgba(196,113,74,0.1); }
        .ttp-textarea::placeholder { color: #9A7E68; font-weight: 300; }
        .ttp-textarea-readonly { background: rgba(255,255,255,0.5); cursor: default; }
        .ttp-input { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #2C1F14; outline: none; box-sizing: border-box; }
        .ttp-input::placeholder { color: #9A7E68; }
        .ttp-select { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #2C1F14; outline: none; cursor: pointer; box-sizing: border-box; }
        .ttp-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .ttp-btn { width: 100%; padding: 14px; border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .ttp-btn-primary { background: linear-gradient(135deg, #C4714A, #A85A36); color: white; box-shadow: 0 4px 16px rgba(196,113,74,0.3); }
        .ttp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(196,113,74,0.4); }
        .ttp-btn-secondary { background: rgba(196,113,74,0.1); color: #A85A36; border: 1.5px solid rgba(196,113,74,0.2); }
        .ttp-btn-secondary:hover { background: rgba(196,113,74,0.15); }
        .ttp-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .ttp-result-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600; color: #2C1F14; margin-bottom: 4px; }
        .ttp-result-summary { font-size: 14px; color: #9A7E68; margin-bottom: 20px; }
        .ttp-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .ttp-meta-item { background: rgba(255,255,255,0.6); border: 1px solid rgba(196,113,74,0.1); border-radius: 10px; padding: 10px 14px; }
        .ttp-meta-key { font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #C4714A; margin-bottom: 3px; }
        .ttp-meta-val { font-size: 13px; color: #3A2A1E; }
        .ttp-final-label { font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #6B4F38; margin-bottom: 8px; display: block; }
        @media (max-width: 640px) {
          .ttp-grid3 { grid-template-columns: 1fr; }
          .ttp-meta-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="ttp-wrap">
        <h1 className="ttp-title">Thought <em>to Prompt</em></h1>
        <p className="ttp-sub">Describe your idea the way it comes to you — Zenavant turns it into a polished AI prompt.</p>

        <div className="ttp-card">
          <div className="ttp-field">
            <label className="ttp-label">Your idea</label>
            <textarea
              className="ttp-textarea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe the idea the way it comes to you..."
              rows={5}
            />
          </div>

          <div className="ttp-grid3 ttp-field">
            <div>
              <label className="ttp-label">Mode</label>
              <select className="ttp-select" value={mode} onChange={(e) => setMode(e.target.value as "image" | "image-to-video" | "video")}>
                <option value="image">Image</option>
                <option value="image-to-video">Image to Video</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="ttp-label">Intensity</label>
              <select className="ttp-select" value={intensity} onChange={(e) => setIntensity(e.target.value as "subtle" | "balanced" | "dramatic")}>
                <option value="subtle">Subtle</option>
                <option value="balanced">Balanced</option>
                <option value="dramatic">Dramatic</option>
              </select>
            </div>
            <div>
              <label className="ttp-label">Style hint</label>
              <input className="ttp-input" value={styleHint} onChange={(e) => setStyleHint(e.target.value)} placeholder="Optional style hint" />
            </div>
          </div>

          <button className="ttp-btn ttp-btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? "Building prompt…" : "Build Prompt"}
          </button>
        </div>

        {result && (
          <div className="ttp-card">
            <div className="ttp-result-title">{result.title}</div>
            <div className="ttp-result-summary">{result.summary}</div>

            <div className="ttp-meta-grid">
              {[
                { key: "Subject", val: result.subject },
                { key: "Setting", val: result.setting },
                { key: "Action", val: result.action },
                { key: "Emotion", val: result.emotion },
                { key: "Camera", val: result.camera },
                { key: "Style", val: result.style },
              ].map((item) => (
                <div key={item.key} className="ttp-meta-item">
                  <div className="ttp-meta-key">{item.key}</div>
                  <div className="ttp-meta-val">{item.val}</div>
                </div>
              ))}
            </div>

            <div className="ttp-field">
              <label className="ttp-final-label">Final Prompt</label>
              <textarea
                className={`ttp-textarea ttp-textarea-readonly`}
                value={result.finalPrompt}
                readOnly
                rows={7}
              />
            </div>

            <button className="ttp-btn ttp-btn-secondary" onClick={handleSavePrompt} disabled={saving}>
              {saving ? "Saving…" : "Save Prompt to Library"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Plan = {
  title: string;
  summary: string;
  steps: string[];
  firstTinyAction: string;
  encouragement: string;
};

export default function TurnThoughtIntoPlanPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [thought, setThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = thought.trim().length >= 5;

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

  async function generate() {
    if (!canSubmit) return;
    setLoading(true); setError(null); setPlan(null);
    try {
      const res = await fetch("/api/turn-thought-into-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thought }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Request failed"); return; }
      setPlan(data);
      setThought("");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function buildPlanPrompt() {
    if (!plan) return "";
    return `${plan.title || ""}\n${plan.summary || ""}\n${plan.steps?.join(" ") || ""}\n${plan.firstTinyAction || ""}\n${plan.encouragement || ""}`.trim();
  }

  function usePlanForImage() {
    const prompt = buildPlanPrompt();
    if (!prompt) return;
    localStorage.setItem("zenavant_prompt", prompt);
    router.push("/tools/image-maker");
  }

  function usePlanForVideo() {
    const prompt = buildPlanPrompt();
    if (!prompt) return;
    localStorage.setItem("zenavant_prompt", prompt);
    router.push("/tools/video-maker");
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
        .pl-wrap { max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; font-family: 'DM Sans', sans-serif; color: #3A2A1E; }
        .pl-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 4vw, 42px); font-weight: 300; color: #2C1F14; margin-bottom: 6px; }
        .pl-title em { font-style: italic; color: #C4714A; }
        .pl-sub { font-size: 15px; font-weight: 300; color: #6B4F38; margin-bottom: 32px; }
        .pl-card { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 20px; padding: 32px; box-shadow: 0 2px 20px rgba(44,31,20,0.06); margin-bottom: 24px; }
        .pl-label { display: block; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #6B4F38; margin-bottom: 8px; }
        .pl-field { margin-bottom: 20px; }
        .pl-textarea { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 15px; color: #2C1F14; outline: none; resize: vertical; transition: border-color 0.2s; box-sizing: border-box; }
        .pl-textarea:focus { border-color: #C4714A; box-shadow: 0 0 0 3px rgba(196,113,74,0.1); }
        .pl-textarea::placeholder { color: #9A7E68; font-weight: 300; }
        .pl-hint { font-size: 13px; color: #9A7E68; margin-top: 8px; }
        .pl-btn { padding: 14px 28px; border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .pl-btn-primary { background: linear-gradient(135deg, #C4714A, #A85A36); color: white; box-shadow: 0 4px 16px rgba(196,113,74,0.3); }
        .pl-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(196,113,74,0.4); }
        .pl-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .pl-btn-secondary { background: rgba(196,113,74,0.1); color: #A85A36; border: 1.5px solid rgba(196,113,74,0.2); }
        .pl-btn-secondary:hover { background: rgba(196,113,74,0.15); }
        .pl-btn-outline { background: white; color: #6B4F38; border: 1.5px solid #E8DFD0; }
        .pl-btn-outline:hover { border-color: #C4714A; color: #C4714A; }
        .pl-error { background: #FEF2EE; border: 1px solid #F0B8A0; color: #A85A36; border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-top: 12px; }
        .pl-result-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 400; color: #2C1F14; margin-bottom: 8px; }
        .pl-result-summary { font-size: 15px; color: #6B4F38; line-height: 1.7; margin-bottom: 28px; }
        .pl-section-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; color: #2C1F14; margin-bottom: 12px; }
        .pl-steps { list-style: none; padding: 0; margin: 0 0 28px; display: flex; flex-direction: column; gap: 10px; }
        .pl-step { display: flex; gap: 14px; align-items: flex-start; background: rgba(255,255,255,0.6); border: 1px solid rgba(196,113,74,0.1); border-radius: 12px; padding: 14px 16px; }
        .pl-step-num { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 600; color: #C4714A; flex-shrink: 0; line-height: 1.4; }
        .pl-step-text { font-size: 14px; color: #3A2A1E; line-height: 1.6; }
        .pl-action { background: rgba(196,113,74,0.06); border: 1px solid rgba(196,113,74,0.15); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; }
        .pl-action-label { font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: #C4714A; margin-bottom: 6px; }
        .pl-action-text { font-size: 15px; color: #2C1F14; line-height: 1.6; }
        .pl-encouragement { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 18px; color: #6B4F38; line-height: 1.6; margin-bottom: 28px; }
        .pl-btn-row { display: flex; gap: 12px; flex-wrap: wrap; }
      `}</style>

      <div className="pl-wrap">
        <h1 className="pl-title">Turn a thought <em>into a plan</em></h1>
        <p className="pl-sub">Write one thought. Zenavant turns it into a calm, actionable plan.</p>

        <div className="pl-card">
          <div className="pl-field">
            <label className="pl-label">Your thought</label>
            <textarea
              className="pl-textarea"
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              placeholder="Example: I want to start a small YouTube series but I'm overwhelmed."
              rows={5}
            />
            <p className="pl-hint">{loading ? "One moment…" : "Keep it short and honest."}</p>
          </div>

          <button className="pl-btn pl-btn-primary" onClick={generate} disabled={loading || !canSubmit}>
            {loading ? "Creating plan…" : "Create Plan"}
          </button>

          {error && <div className="pl-error">{error}</div>}
        </div>

        {plan && (
          <div className="pl-card">
            <div className="pl-result-title">{plan.title}</div>
            <div className="pl-result-summary">{plan.summary}</div>

            <div className="pl-section-title">Steps</div>
            <ol className="pl-steps">
              {plan.steps.map((s, i) => (
                <li key={i} className="pl-step">
                  <span className="pl-step-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="pl-step-text">{s}</span>
                </li>
              ))}
            </ol>

            <div className="pl-action">
              <div className="pl-action-label">First tiny action</div>
              <div className="pl-action-text">{plan.firstTinyAction}</div>
            </div>

            <div className="pl-encouragement">"{plan.encouragement}"</div>

            <div className="pl-btn-row">
              <button className="pl-btn pl-btn-secondary" onClick={usePlanForImage}>
                Use for Image
              </button>
              <button className="pl-btn pl-btn-outline" onClick={usePlanForVideo}>
                Use for Video
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

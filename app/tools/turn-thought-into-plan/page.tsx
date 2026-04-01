"use client";

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

  const [thought, setThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = thought.trim().length >= 5;

  // Protect page
  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
      }
    }

    checkUser();
  }, [router]);

  async function generate() {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const res = await fetch("/api/turn-thought-into-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thought }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Request failed");
        return;
      }

      setPlan(data);
      setThought("");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // keep the rest of your existing file below this line
  
  function buildPlanPrompt() {
    if (!plan) return;

    return `
${plan.title || ""}
${plan.summary || ""}
${plan.steps?.join(" ") || ""}
${plan.firstTinyAction || ""}
${plan.encouragement || ""}
    `.trim();
  }
  
  function usePlanForImage() {
    const prompt = buildPlanPrompt();
    if (!prompt) return;

    localStorage.setItem("zenavant_prompt", prompt);
    window.location.href = "/tools/image-maker";
  }

  function usePlanForVideo() {
    const prompt = buildPlanPrompt();
    if (!prompt) return;

    localStorage.setItem("zenavant_prompt", prompt);
    window.location.href = "/tools/video-maker";
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 34, fontWeight: 750, marginBottom: 6 }}>
        Turn a thought into a plan
      </h1>

      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Write one thought. Zenavant turns it into a calm, actionable plan.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          background: "rgba(255,255,255,0.9)",
        }}
      >
        <label
          style={{ display: "block", fontWeight: 650, marginBottom: 8 }}
        >
          Your thought
        </label>

        <textarea
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          placeholder='Example: I want to start a small YouTube series but I’m overwhelmed.'
          rows={5}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.18)",
            outline: "none",
            background: "#fff",
            color: "#111",
            resize: "vertical",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={generate}
            disabled={loading || !canSubmit}
            style={{
              padding: "10px 14px",
              fontSize: 16,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background:
                loading || !canSubmit ? "rgba(0,0,0,0.08)" : "#111",
              color: loading || !canSubmit ? "#444" : "#fff",
              cursor: loading || !canSubmit ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating plan..." : "Create plan"}
          </button>

          <span style={{ opacity: 0.7, fontSize: 14 }}>
            {loading ? "One moment..." : "Keep it short and honest."}
          </span>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(220, 38, 38, 0.35)",
              background: "rgba(220, 38, 38, 0.06)",
              color: "#7f1d1d",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {plan && (
        <section
          style={{
            marginTop: 18,
            padding: 16,
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.9)",
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 750, marginTop: 0 }}>
            {plan.title}
          </h2>

          <p style={{ marginTop: 8 }}>{plan.summary}</p>

          <h3 style={{ marginTop: 14, fontSize: 18, fontWeight: 750 }}>
            Steps
          </h3>

          <ol style={{ marginTop: 8, paddingLeft: 18 }}>
            {plan.steps.map((s, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {s}
              </li>
            ))}
          </ol>

          <h3 style={{ marginTop: 14, fontSize: 18, fontWeight: 750 }}>
            First tiny action
          </h3>

          <p style={{ marginTop: 8 }}>{plan.firstTinyAction}</p>

          <p style={{ marginTop: 14, opacity: 0.85 }}>{plan.encouragement}</p>

          <div
           style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
            flexWrap: "wrap",
           }}
           
           >

           
          <button
            onClick={usePlanForImage}
            style={{
              padding: "10px 14px",
              fontSize: 15,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Use for image
          </button>
          
          <button
            onClick={usePlanForVideo}
            style={{
              padding: "10px 14px",
              fontSize: 15,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "#fff",
              color: "#111",
              cursor: "pointer",
            }}

          >
      
            Use for video
          </button>
         </div>
        </section>
      )}
      </main>
    );
  }
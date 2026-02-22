"use client";

import { useState } from "react";

type Plan = {
  title: string;
  summary: string;
  steps: string[];
  firstTinyAction: string;
  encouragement: string;
};

export default function TurnThoughtIntoPlanPage() {
  const [thought, setThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
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
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>Turn a thought into a plan</h1>
      <p style={{ opacity: 0.8, marginTop: 8 }}>
        Write one thought. Zenavant turns it into a calm, actionable plan.
      </p>

      <div style={{ marginTop: 16 }}>
        <textarea
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          placeholder="Example: I want to start a small YouTube series but I’m overwhelmed."
          rows={5}
          style={{ width: "100%", padding: 12, fontSize: 16 }}
        />
      </div>

      <button
        onClick={generate}
        disabled={loading || thought.trim().length < 5}
        style={{
          marginTop: 12,
          padding: "10px 14px",
          fontSize: 16,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Creating plan..." : "Create plan"}
      </button>

      {error && (
        <p style={{ marginTop: 12, color: "crimson" }}>
          {error}
        </p>
      )}

      {plan && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>{plan.title}</h2>
          <p style={{ marginTop: 8 }}>{plan.summary}</p>

          <h3 style={{ marginTop: 14, fontSize: 18, fontWeight: 700 }}>Steps</h3>
          <ol style={{ marginTop: 8 }}>
            {plan.steps.map((s, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{s}</li>
            ))}
          </ol>

          <h3 style={{ marginTop: 14, fontSize: 18, fontWeight: 700 }}>First tiny action</h3>
          <p style={{ marginTop: 8 }}>{plan.firstTinyAction}</p>

          <p style={{ marginTop: 14, opacity: 0.85 }}>
            {plan.encouragement}
          </p>
        </section>
      )}
    </main>
  );
}
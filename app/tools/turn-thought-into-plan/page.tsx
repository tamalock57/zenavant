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

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [thought, setThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = thought.trim().length >= 5;

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        router.replace("/");
        return;
      }

      setCheckingAuth(false);
    }

    checkUser();

    return () => {
      mounted = false;
    };
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

  function buildPlanPrompt() {
    if (!plan) return "";

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
    router.push("/tools/image-maker");
  }

  function usePlanForVideo() {
    const prompt = buildPlanPrompt();
    if (!prompt) return;
    localStorage.setItem("zenavant_prompt", prompt);
    router.push("/tools/video-maker");
  }

  if (checkingAuth) {
    return (
      <div className="max-w-3xl mx-auto p-4 text-black">
        Loading...
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4 text-black">
      <h1 className="text-2xl md:text-3xl font-semibold">
        Turn a thought into a plan
      </h1>

      <p className="text-neutral-600">
        Write one thought. Zenavant turns it into a calm, actionable plan.
      </p>

      <div className="rounded-2xl border border-neutral-300 bg-white p-4 space-y-4">
        <label className="block font-semibold">Your thought</label>

        <textarea
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          placeholder="Example: I want to start a small YouTube series but I’m overwhelmed."
          rows={5}
          className="w-full rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={generate}
            disabled={loading || !canSubmit}
            className="rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? "Creating plan..." : "Create plan"}
          </button>

          <span className="text-sm text-neutral-600">
            {loading ? "One moment..." : "Keep it short and honest."}
          </span>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}
      </div>

      {plan && (
        <section className="rounded-2xl border border-neutral-300 bg-white p-4 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{plan.title}</h2>
            <p className="mt-2 text-black">{plan.summary}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Steps</h3>
            <ol className="mt-2 list-decimal pl-5 space-y-2">
              {plan.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-semibold">First tiny action</h3>
            <p className="mt-2">{plan.firstTinyAction}</p>
          </div>

          <p className="text-neutral-700">{plan.encouragement}</p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={usePlanForImage}
              className="rounded-2xl bg-black px-4 py-3 text-white"
            >
              Use for image
            </button>

            <button
              onClick={usePlanForVideo}
              className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-black"
            >
              Use for video
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
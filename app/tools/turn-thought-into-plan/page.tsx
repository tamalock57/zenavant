"use client";

import { useState } from "react";

type Plan = {
 title: string;
 summary: string;
 steps: string[];
 firstTinyAction: string;
 encouragement: string;
}

export default function TurnThoughtIntoPlanPage() {

const [thought, setThought] = useState("");
const [loading, setLoading] = useState(false);
const [plan, setPlan] = useState<Plan | null>(null);
const [error, setError] = useState<string | null>(null);

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

  const canSubmit = thought.trim().length >= 5;

  return (
    <main>
      {/* JSX goes here */}
    </main>
  );
}
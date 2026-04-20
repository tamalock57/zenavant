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

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleGenerate() {
    try {
      if (idea.trim().length < 5) {
        alert("Please describe the idea first.");
        return;
      }

      setLoading(true);
      setResult(null);

      const res = await fetch("/api/turn-thought-into-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea,
          mode,
          intensity,
          styleHint,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to build prompt.");
        return;
      }

      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePrompt() {
    try {
      if (!result?.finalPrompt) {
        alert("Generate a prompt first.");
        return;
      }

      setSaving(true);

      const res = await fetch("/api/save-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: result.title || "Prompt",
          idea,
          prompt: result.finalPrompt,
          tool: "turn-thought-into-prompt",
          metadata: {
            mode,
            intensity,
            styleHint,
            summary: result.summary,
            subject: result.subject,
            setting: result.setting,
            action: result.action,
            emotion: result.emotion,
            camera: result.camera,
            style: result.style,
            rules: result.rules,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to save prompt.");
        return;
      }

      alert("Prompt saved to Library.");
    } catch (err) {
      console.error(err);
      alert("Failed to save prompt.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="max-w-3xl mx-auto p-4 text-black">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4 text-black">
      <h1 className="text-2xl font-semibold">Turn Thought Into Prompt</h1>

      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Describe the idea the way it comes to you..."
        className="w-full min-h-[140px] rounded-2xl border border-neutral-300 bg-white p-4 text-black placeholder:text-neutral-500"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "image" | "image-to-video" | "video")}
          className="rounded-xl border border-neutral-300 bg-white p-3 text-black"
        >
          <option value="image">Image</option>
          <option value="image-to-video">Image to Video</option>
          <option value="video">Video</option>
        </select>

        <select
          value={intensity}
          onChange={(e) => setIntensity(e.target.value as "subtle" | "balanced" | "dramatic")}
          className="rounded-xl border border-neutral-300 bg-white p-3 text-black"
        >
          <option value="subtle">Make it more subtle</option>
          <option value="balanced">Balanced</option>
          <option value="dramatic">Make it more dramatic</option>
        </select>

        <input
          value={styleHint}
          onChange={(e) => setStyleHint(e.target.value)}
          placeholder="Optional style hint"
          className="rounded-xl border border-neutral-300 bg-white p-3 text-black placeholder:text-neutral-500"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full rounded-2xl bg-neutral-800 px-4 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Building Prompt..." : "Build Prompt"}
      </button>

      {result && (
        <div className="space-y-3 rounded-2xl border border-neutral-300 bg-white p-4 text-black">
          <div>
            <div className="text-lg font-semibold">{result.title}</div>
            <div className="text-sm text-neutral-500">{result.summary}</div>
          </div>

          <div className="grid gap-2 text-sm">
            <div><span className="font-medium">Subject:</span> {result.subject}</div>
            <div><span className="font-medium">Setting:</span> {result.setting}</div>
            <div><span className="font-medium">Action:</span> {result.action}</div>
            <div><span className="font-medium">Emotion:</span> {result.emotion}</div>
            <div><span className="font-medium">Camera:</span> {result.camera}</div>
            <div><span className="font-medium">Style:</span> {result.style}</div>
          </div>

          <div>
            <div className="mb-2 font-medium">Final Prompt</div>
            <textarea
              value={result.finalPrompt}
              readOnly
              className="w-full min-h-[180px] rounded-xl border border-neutral-300 bg-white p-3 text-black"
            />
          </div>

          <button
            onClick={handleSavePrompt}
            disabled={saving}
            className="w-full rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Prompt to Library"}
          </button>
        </div>
      )}
    </div>
  );
}
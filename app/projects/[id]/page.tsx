"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  title: string;
  created_at: string;
};

export default function ProjectPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      setErrorMsg("");
      setLoading(true);

      const { data, error } = await supabase
        .from("projects")
        .select("id, title, created_at")
        .eq("id", id)
        .single();

      if (error) {
        setErrorMsg(error.message);
        setProject(null);
      } else {
        setProject(data as Project);
      }

      setLoading(false);
    };

    if (id) loadProject();
  }, [id]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setGenerating(true);
    setResult(null);

    setTimeout(() => {
      setResult(`Generated result for: "${prompt}"`);
      setGenerating(false);
    }, 1000);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-6 py-10 space-y-8">
      <div className="w-full max-w-2xl">
        <Link href="/dashboard" className="text-sm underline">
          ← Back
        </Link>
      </div>

      <div className="w-full max-w-2xl border rounded p-6 space-y-2">
        {loading ? (
          <div className="text-sm">Loading project...</div>
        ) : errorMsg ? (
          <div className="text-sm text-red-600">{errorMsg}</div>
        ) : project ? (
          <>
            <h1 className="text-3xl font-semibold">{project.title}</h1>
            <p className="text-sm text-neutral-500">
              Created {new Date(project.created_at).toLocaleString()}
            </p>
          </>
        ) : (
          <div className="text-sm">Project not found.</div>
        )}
      </div>

      <div className="w-full max-w-2xl border rounded p-6 space-y-4">
        <h2 className="font-medium">Generate</h2>

        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Describe what you want to create..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <button
          className="rounded bg-black text-white px-4 py-2"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? "Generating..." : "Generate"}
        </button>

        {result && (
          <div className="border rounded p-3 text-sm">
            {result}
          </div>
        )}
      </div>
    </main>
  );
}

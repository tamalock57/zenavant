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

  useEffect(() => {
    const loadProject = async () => {
      setErrorMsg("");
      setLoading(true);

      if (!id) {
        setErrorMsg("Missing project id.");
        setLoading(false);
        return;
      }

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

    loadProject();
  }, [id]);

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

      <div className="w-full max-w-2xl border rounded p-6 text-sm text-neutral-600">
        Generation will live here next.
      </div>
    </main>
  );
}

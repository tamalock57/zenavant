"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setMessage("");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .select("id, title, created_at, owner_id")
        .eq("id", id)
        .single();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setProject(data);
      setLoading(false);
    };

    if (id) load();
  }, [id, router]);

  if (loading) return <div className="p-8">Loading project…</div>;

  if (message) return <div className="p-8 text-red-600">{message}</div>;

  if (!project) return <div className="p-8">Project not found.</div>;

  return (
    <main className="min-h-screen px-6 py-10 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <button className="text-sm underline" onClick={() => router.back()}>
          ← Back
        </button>

        <div className="border rounded p-6 space-y-2">
          <h1 className="text-3xl font-semibold">{project.title}</h1>
          <p className="text-sm text-neutral-600">
            Created {new Date(project.created_at).toLocaleString()}
          </p>
        </div>

        <div className="border rounded p-6 text-neutral-600">
          Generation will live here next.
        </div>
      </div>
    </main>
  );
}

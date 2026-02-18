"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProjectRow = {
  id: string;
  title: string;
  created_at: string;
  owner_id: string;
};

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [message, setMessage] = useState("");

  // 1) Load session + keep it updated
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2) Load projects when we have a session
  useEffect(() => {
    if (!session?.user?.id) return;
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const fetchProjects = async () => {
    setMessage("");
    const { data, error } = await supabase
      .from("projects")
      .select("id,title,created_at,owner_id")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setProjects((data as ProjectRow[]) || []);
  };

  const createProject = async () => {
    setMessage("");

    if (!session?.user?.id) {
      setMessage("No session found. Please sign in again.");
      return;
    }

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setMessage("Please type a project title first.");
      return;
    }

    // IMPORTANT: your DB expects "title" (NOT "name")
    const { error } = await supabase.from("projects").insert({
      title: cleanTitle,
      owner_id: session.user.id, // matches your earlier hint about owner_id
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTitle("");
    fetchProjects();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-neutral-600">Loading session...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-2">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-neutral-600">You’re signed out.</p>
          <a className="underline text-sm" href="/">
            Go to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm text-neutral-600">Signed in as {session.user.email}</p>
        </div>

        {/* Create */}
        <div className="border rounded p-6 space-y-3">
          <p className="font-medium">Create a project</p>

          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <button
            className="rounded bg-black px-4 py-2 text-white"
            onClick={createProject}
          >
            Create
          </button>
        </div>

        {/* List */}
        <div className="border rounded p-6">
          <div className="flex items-center justify-between">
            <p className="font-medium">Your projects</p>
            <button className="text-sm underline" onClick={fetchProjects}>
              Refresh
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {projects.length === 0 ? (
              <p className="text-sm text-neutral-600">No projects yet.</p>
            ) : (
              projects.map((p) => (
                <div key={p.id} className="rounded border p-3">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-neutral-600">
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-center">
          <button className="text-sm text-neutral-600 underline" onClick={signOut}>
            Sign out
          </button>
        </div>

        {message ? <p className="text-sm text-red-600 text-center">{message}</p> : null}
      </div>
    </main>
  );
}

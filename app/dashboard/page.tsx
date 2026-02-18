"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  title: string;
  created_at: string;
};

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [projectTitle, setProjectTitle] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [message, setMessage] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // 1) Get session + stay updated (prevents weird “refresh does nothing” cases)
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setLoadingSession(false);
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

  // 2) Load projects whenever session becomes available
  useEffect(() => {
    if (session?.user?.id) {
      loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const loadProjects = async () => {
    setMessage("");
    if (!session?.user?.id) {
      setMessage("No session yet. Try reloading the page.");
      return;
    }

    setLoadingProjects(true);

    const { data, error } = await supabase
      .from("projects")
      .select("id, title, created_at")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Load error: ${error.message}`);
      setLoadingProjects(false);
      return;
    }

    setProjects((data as Project[]) ?? []);
    setLastUpdated(Date.now());
    setLoadingProjects(false);
  };

  const createProject = async () => {
  setMessage("");

  const title = projectTitle.trim();
  if (!title) {
    setMessage("Please enter a project title.");
    return;
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    setMessage("Not signed in.");
    return;
  }

  const { error } = await supabase.from("projects").insert({
    title,
    owner_id: user.id,
  });

  if (error) {
    setMessage(error.message);
    return;
  }

  // ✅ clear ONLY after success
  setProjectTitle("");

  // refresh list (optional await)
  await loadProjects();
};


  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loadingSession) return <div className="p-8">Loading session…</div>;
  if (!session) return <div className="p-8">Not signed in.</div>;

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-neutral-600 text-sm">Signed in as {session.user.email}</p>
          {lastUpdated && (
            <p className="text-xs text-neutral-500">
              Last refreshed: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>

        {/* Create Project */}
        <div className="border rounded p-6 space-y-3">
          <h2 className="font-medium">Create a project</h2>

          <input
           value={projectTitle}
           onChange={(e) => setProjectTitle(e.target.value)}
           className="w-full rounded border px-3 py-2"
           placeholder="Project title"
         />


          <button
            className="rounded bg-black text-white px-4 py-2"
            onClick={createProject}
          >
            Create
          </button>

          {message && <p className="text-sm text-red-600">{message}</p>}
        </div>

        {/* Project List */}
        <div className="border rounded p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Your projects</h2>
            <button
              className="text-sm underline"
              onClick={loadProjects}
              disabled={loadingProjects}
            >
              {loadingProjects ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {projects.length === 0 ? (
            <p className="text-sm text-neutral-600">
              {loadingProjects ? "Loading…" : "No projects yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <div key={p.id} className="border rounded p-3 text-sm">
                  <a className="font-medium underline" href={`/projects/${p.id}`}>
              {p.title}
            </a>

                  <div className="text-neutral-500 text-xs">
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <button className="text-sm underline text-neutral-600" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}

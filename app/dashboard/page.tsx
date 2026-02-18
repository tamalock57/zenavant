"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  // Load session on mount
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
      if (data.session) {
        loadProjects();
      }
    };
    getSession();
  }, []);

  // Load projects
  const loadProjects = async () => {
    setProjectsLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      setMessage("No active session found.");
      setProjectsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .select("id, title, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Load error: ${error.message}`);
      setProjectsLoading(false);
      return;
    }

    setProjects(data ?? []);
    setProjectsLoading(false);
  };

  // Create project
  const createProject = async () => {
    setMessage("");

    if (!projectTitle.trim()) {
      setMessage("Please enter a project title.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      setMessage("No active session.");
      return;
    }

    const { error } = await supabase.from("projects").insert({
      title: projectTitle,
      owner_id: user.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setProjectTitle("");
    loadProjects();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    return <div className="p-8">Not signed in.</div>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-neutral-500 mt-2">
          Signed in as {session.user.email}
        </p>
      </div>

      {/* Create Project */}
      <div className="w-full max-w-xl border rounded p-6 space-y-4">
        <h2 className="font-medium">Create a project</h2>

        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Project title"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
        />

        <button
          className="rounded bg-black text-white px-4 py-2"
          onClick={createProject}
        >
          Create
        </button>

        {message && (
          <p className="text-sm text-red-500">{message}</p>
        )}
      </div>

      {/* Project List */}
      <div className="w-full max-w-xl border rounded p-6 space-y-4">
        <div className="flex justify-between">
          <h2 className="font-medium">Your projects</h2>
          <button
            className="text-sm underline"
            onClick={loadProjects}
            disabled={projectsLoading}
          >
            {projectsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No projects yet.
          </p>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              className="border rounded p-3 text-sm"
            >
              <div>{p.title}</div>
              <div className="text-neutral-400 text-xs">
                {new Date(p.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      <button
        className="text-sm underline"
        onClick={signOut}
      >
        Sign out
      </button>
    </main>
  );
}

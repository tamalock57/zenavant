"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  name: string;
  created_at: string;
  owner_id: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<string>("");

  // 1) Load session + protect route
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;

      if (!sess) {
        router.replace("/"); // send to home/login
        return;
      }

      if (!isMounted) return;

      setSessionEmail(sess.user.email ?? null);
      setLoading(false);
      await loadProjects();
    };

    init();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Load projects
  const loadProjects = async () => {
    setMessage("");
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setProjects((data as Project[]) ?? []);
  };

  // 3) Create project
  const createProject = async () => {
    setMessage("");
    const name = newName.trim();
    if (!name) {
      setMessage("Please enter a project name.");
      return;
    }

    // Important: we insert owner_id (matches your DB)
    const { data: sessData } = await supabase.auth.getSession();
    const userId = sessData.session?.user.id;

    if (!userId) {
      setMessage("Not signed in.");
      router.replace("/");
      return;
    }

    const { error } = await supabase.from("projects").insert({
      name,
      owner_id: userId,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setNewName("");
    setMessage("Project created.");
    await loadProjects();
  };

  // 4) Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  // UI
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-neutral-600">Loading session…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 flex justify-center">
      <div className="w-full max-w-2xl space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm text-neutral-600">
            Signed in as {sessionEmail ?? "—"}
          </p>
        </header>

        <section className="border rounded p-6 space-y-3">
          <h2 className="font-medium">Create a project</h2>

          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <button
            className="rounded bg-black px-4 py-2 text-white"
            onClick={createProject}
          >
            Create
          </button>
        </section>

        <section className="border rounded p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Your projects</h2>
            <button className="text-sm underline" onClick={loadProjects}>
              Refresh
            </button>
          </div>

          {projects.length === 0 ? (
            <p className="text-sm text-neutral-600">No projects yet.</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id} className="rounded border px-3 py-2">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-neutral-600">
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {message ? <p className="text-sm text-neutral-700">{message}</p> : null}

        <button className="text-sm underline" onClick={signOut}>
          Sign out
        </button>
      </div>
    </main>
  );
}

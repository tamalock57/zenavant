"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  title: string;
  description?: string | null;
  created_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Unknown date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleString();
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProjects(showSpinner = true) {
    try {
      if (showSpinner) setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("projects")
        .select("id, title, description, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProjects(data ?? []);
    } catch (err) {
      console.error("Dashboard load failed:", err);
      setError("Could not load projects.");
    } finally {
      if (showSpinner) setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadProjects(false);
    } catch (err) {
      console.error(err);
      setRefreshing(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter a project title.");
      return;
    }

    try {
      setCreating(true);

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
      };

      const { data, error } = await supabase
        .from("projects")
        .insert([payload])
        .select("id, title, description, created_at")
        .single();

      if (error) throw error;

      setProjects((prev) => [data, ...prev]);
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error("Create project failed:", err);
      alert("Could not create project.");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    loadProjects(true);
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create projects and keep your workflow organized.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr,1.4fr]">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Create a Project</h2>
          <p className="mt-2 text-sm text-gray-600">
            Start something new and keep your ideas organized.
          </p>

          <form onSubmit={handleCreateProject} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Project Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter project title"
                className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a short description"
                rows={4}
                className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Project"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Projects</h2>
            <span className="text-sm text-gray-500">
              {projects.length} total
            </span>
          </div>

          {loading ? (
            <div className="text-sm text-gray-600">Loading projects...</div>
          ) : error ? (
            <div className="text-sm text-red-700">{error}</div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              No projects yet.
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border p-4 transition hover:bg-gray-50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {project.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {project.description || "No description."}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {formatDate(project.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/tools/image-maker"
                        className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
                      >
                        Image
                      </Link>
                      <Link
                        href="/tools/video-maker"
                        className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
                      >
                        Video
                      </Link>
                      <Link
                        href="/tools/turn-thought-into-plan"
                        className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                      >
                        Plan
                      </Link>
                      <Link
                        href="/tools/library"
                        className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
                      >
                        Library
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
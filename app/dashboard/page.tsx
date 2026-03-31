"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  name: string | null;
  description: string | null;
  created_at: string | null;
  status?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString();
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  async function loadProjects(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, created_at, status")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProjects(data ?? []);
      setLastRefreshed(new Date().toLocaleString());
    } catch (err) {
      console.error("Dashboard load failed:", err);
      setError("Could not load projects.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadProjects(false);
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter a project name.");
      return;
    }

    try {
      setCreating(true);

      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            name: name.trim(),
            description: description.trim() || null,
            status: "active",
          },
        ])
        .select("id, name, description, created_at, status")
        .single();

      if (error) throw error;

      setProjects((prev) => [data, ...prev]);
      setName("");
      setDescription("");
      setLastRefreshed(new Date().toLocaleString());
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
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-3 text-base text-gray-600">
          Create projects and keep your workflow organized.
        </p>
        {lastRefreshed && (
          <p className="mt-2 text-sm text-gray-500">Last refreshed: {lastRefreshed}</p>
        )}
      </div>

      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="mb-10 w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {refreshing ? "Refreshing..." : "Refresh"}
      </button>

      <div className="grid gap-10">
        <section className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold">Create a Project</h2>
          <p className="mt-2 text-sm text-gray-600">
            Start something new and keep your ideas organized.
          </p>

          <form onSubmit={handleCreateProject} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Project Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                rows={5}
                className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Project"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Projects</h2>
            <span className="text-sm text-gray-500">{projects.length} total</span>
          </div>

          {loading ? (
            <div className="text-sm text-gray-600">Loading projects...</div>
          ) : error ? (
            <div className="text-sm text-red-700">{error}</div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-gray-600">
              No projects yet.
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="rounded-xl border p-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {project.name || "Untitled project"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {project.description || "No description."}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {formatDate(project.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
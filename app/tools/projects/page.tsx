"use client";

import { useEffect, useState } from "react";

type Project = {
  id: string;
  title: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProjects(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setMessage("");

      const res = await fetch("/api/projects", {
        cache: "no-store",
      });

      const data = await res.json();
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch {
      setMessage("Failed to load projects.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function handleCreateProject() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setMessage("Enter a project title.");
      return;
    }

    try {
      setCreating(true);
      setMessage("");

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: cleanTitle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to create project.");
        return;
      }

      setTitle("");
      setMessage("Project created.");
      await loadProjects(false);
    } catch {
      setMessage("Failed to create project.");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 20,
        fontFamily: "system-ui",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 6 }}>Projects</h1>
        <p style={{ opacity: 0.7, marginTop: 0 }}>
          Group your ideas and creations into organized workspaces.
        </p>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 16,
          background: "#fff",
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 20 }}>Create project</h2>

        <div
          style={{
            display: "grid",
            gap: 12,
            maxWidth: 520,
          }}
        >
          <input
            type="text"
            placeholder="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />

          <div>
            <button
              onClick={handleCreateProject}
              disabled={creating}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                fontSize: 14,
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? "Creating..." : "Create project"}
            </button>
          </div>

          {message && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                opacity: 0.75,
              }}
            >
              {message}
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 16,
          background: "#fff",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 20 }}>Your projects</h2>

        {loading ? (
          <p>Loading...</p>
        ) : projects.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No projects yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  border: "1px solid #ececec",
                  borderRadius: 12,
                  padding: 14,
                  background: "#fafafa",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  {project.title}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    fontSize: 13,
                    opacity: 0.7,
                  }}
                >
                  {project.status && <span>Status: {project.status}</span>}
                  {project.created_at && (
                    <span>
                      Created:{" "}
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
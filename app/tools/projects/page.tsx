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
      const res = await fetch("/api/projects", { cache: "no-store" });
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
    if (!cleanTitle) { setMessage("Enter a project title."); return; }
    try {
      setCreating(true); setMessage("");
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cleanTitle }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Failed to create project."); return; }
      setTitle("");
      setMessage("Project created.");
      await loadProjects(false);
    } catch {
      setMessage("Failed to create project.");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => { loadProjects(); }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        .pr-wrap { max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; font-family: 'DM Sans', sans-serif; color: #3A2A1E; }
        .pr-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 4vw, 42px); font-weight: 300; color: #2C1F14; margin-bottom: 6px; }
        .pr-title em { font-style: italic; color: #C4714A; }
        .pr-sub { font-size: 15px; font-weight: 300; color: #6B4F38; margin-bottom: 32px; }
        .pr-card { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 20px; padding: 32px; box-shadow: 0 2px 20px rgba(44,31,20,0.06); margin-bottom: 24px; }
        .pr-card-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 400; color: #2C1F14; margin-bottom: 20px; }
        .pr-label { display: block; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #6B4F38; margin-bottom: 8px; }
        .pr-field { margin-bottom: 16px; }
        .pr-input { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8); border: 1.5px solid #E8DFD0; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 15px; color: #2C1F14; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .pr-input:focus { border-color: #C4714A; box-shadow: 0 0 0 3px rgba(196,113,74,0.1); }
        .pr-input::placeholder { color: #9A7E68; font-weight: 300; }
        .pr-btn { padding: 12px 24px; border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; background: linear-gradient(135deg, #C4714A, #A85A36); color: white; box-shadow: 0 4px 16px rgba(196,113,74,0.3); }
        .pr-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(196,113,74,0.4); }
        .pr-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .pr-message-success { font-size: 13px; color: #3A6B2E; background: rgba(100,180,100,0.08); border: 1px solid rgba(100,180,100,0.2); border-radius: 8px; padding: 8px 12px; margin-top: 12px; }
        .pr-message-error { font-size: 13px; color: #A85A36; background: #FEF2EE; border: 1px solid #F0B8A0; border-radius: 8px; padding: 8px 12px; margin-top: 12px; }
        .pr-empty { text-align: center; padding: 40px 20px; color: #9A7E68; font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 18px; }
        .pr-loading { text-align: center; padding: 40px 20px; color: #9A7E68; font-size: 15px; }
        .pr-projects-grid { display: flex; flex-direction: column; gap: 12px; }
        .pr-project { background: rgba(255,255,255,0.7); border: 1px solid rgba(196,113,74,0.12); border-radius: 14px; padding: 18px 20px; transition: all 0.2s; }
        .pr-project:hover { border-color: rgba(196,113,74,0.3); box-shadow: 0 4px 16px rgba(196,113,74,0.08); }
        .pr-project-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; color: #2C1F14; margin-bottom: 6px; }
        .pr-project-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: #9A7E68; }
        .pr-project-status { display: inline-flex; align-items: center; gap: 4px; background: rgba(196,113,74,0.08); color: #C4714A; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; }
      `}</style>

      <div className="pr-wrap">
        <h1 className="pr-title">Your <em>Projects</em></h1>
        <p className="pr-sub">Group your ideas and creations into organized workspaces.</p>

        {/* Create */}
        <div className="pr-card">
          <div className="pr-card-title">Create a project</div>
          <div className="pr-field">
            <label className="pr-label">Project title</label>
            <input
              className="pr-input"
              type="text"
              placeholder="e.g. Short Film, Brand Campaign, Music Video..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
            />
          </div>
          <button className="pr-btn" onClick={handleCreateProject} disabled={creating}>
            {creating ? "Creating…" : "Create Project"}
          </button>
          {message && (
            <div className={message.toLowerCase().includes("fail") || message.toLowerCase().includes("enter") ? "pr-message-error" : "pr-message-success"}>
              {message}
            </div>
          )}
        </div>

        {/* List */}
        <div className="pr-card">
          <div className="pr-card-title">Your projects</div>
          {loading && <div className="pr-loading">Loading…</div>}
          {!loading && projects.length === 0 && (
            <div className="pr-empty">No projects yet. Create one above!</div>
          )}
          {!loading && projects.length > 0 && (
            <div className="pr-projects-grid">
              {projects.map((project) => (
                <div key={project.id} className="pr-project">
                  <div className="pr-project-title">{project.title}</div>
                  <div className="pr-project-meta">
                    {project.status && (
                      <span className="pr-project-status">{project.status}</span>
                    )}
                    {project.created_at && (
                      <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                    )}
                    {project.updated_at && (
                      <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
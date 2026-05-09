"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type RawItem = {
  id: string;
  type?: string | null;
  title?: string | null;
  idea?: string | null;
  prompt?: string | null;
  url?: string | null;
  storage_path?: string | null;
  tool?: string | null;
  created_at?: string | null;
};

type Item = RawItem & {
  mediaUrl: string | null;
  normalizedType: "prompt" | "plan" | "video" | "image" | "unknown";
};

type FilterType = "all" | "video" | "image" | "prompt" | "plan";

function getPublicUrl(path?: string | null) {
  if (!path) return null;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString();
}

function normalizeType(item: RawItem, mediaUrl: string | null): Item["normalizedType"] {
  const type = (item.type || "").toLowerCase();
  const url = (mediaUrl || "").toLowerCase();
  if (type === "prompt") return "prompt";
  if (type === "plan") return "plan";
  if (url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov")) return "video";
  if (url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".webp")) return "image";
  if (item.prompt && !mediaUrl) return "prompt";
  return "unknown";
}

const TYPE_EMOJI: Record<string, string> = {
  video: "🎬", image: "🎨", prompt: "💡", plan: "📋", unknown: "📄",
};

export default function LibraryPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setIsAuthed(true);
      setCheckingAuth(false);
    }
    checkSession();
  }, [router]);

  async function fetchLibrary() {
    try {
      setLoading(true);
      const res = await fetch("/api/library");
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to load"); return; }
      const mapped: Item[] = (data.items || []).map((item: RawItem) => {
        const mediaUrl = item.url || getPublicUrl(item.storage_path);
        return { ...item, mediaUrl, normalizedType: normalizeType(item, mediaUrl) };
      });
      setItems(mapped);
    } catch (err) {
      console.error(err);
      alert("Error loading library");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checkingAuth && isAuthed) fetchLibrary();
  }, [checkingAuth, isAuthed]);

  async function handleDelete(item: Item) {
    if (!confirm("Delete this item?")) return;
    setDeletingId(item.id);
    try {
      const isplan = item.normalizedType === "plan";
      const endpoint = isplan ? "/api/library/delete-plan" : "/api/library/delete";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, storage_path: item.storage_path }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Delete failed"); return; }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  function usePromptForImage(item: Item) {
    const text = item.prompt || item.title;
    if (!text) return alert("No prompt found");
    localStorage.setItem("zenavant_prompt", text);
    router.push("/tools/image-maker");
  }

  function usePromptForVideo(item: Item) {
    const text = item.prompt || item.title;
    if (!text) return alert("No prompt found");
    localStorage.setItem("zenavant_prompt", text);
    router.push("/tools/video-maker");
  }

  function handleDownload(item: Item) {
    if (!item.mediaUrl) { alert("No file available"); return; }
    const link = document.createElement("a");
    link.href = item.mediaUrl;
    link.download = item.title || item.id;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.normalizedType === filter);
  }, [items, filter]);

  const counts = useMemo(() => ({
    all: items.length,
    video: items.filter((i) => i.normalizedType === "video").length,
    image: items.filter((i) => i.normalizedType === "image").length,
    prompt: items.filter((i) => i.normalizedType === "prompt").length,
    plan: items.filter((i) => i.normalizedType === "plan").length,
  }), [items]);

  if (checkingAuth) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F2" }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", color: "#C4714A" }}>Loading…</div>
    </div>
  );

  if (!isAuthed) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        .lib-wrap { max-width: 1100px; margin: 0 auto; padding: 40px 24px 80px; font-family: 'DM Sans', sans-serif; color: #3A2A1E; }
        .lib-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
        .lib-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 4vw, 42px); font-weight: 300; color: #2C1F14; }
        .lib-title em { font-style: italic; color: #C4714A; }
        .lib-refresh { padding: 10px 20px; background: rgba(196,113,74,0.1); color: #A85A36; border: 1.5px solid rgba(196,113,74,0.2); border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .lib-refresh:hover { background: rgba(196,113,74,0.15); }
        .lib-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px; }
        .lib-filter { padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
        .lib-filter-inactive { background: rgba(196,113,74,0.06); color: #6B4F38; }
        .lib-filter-inactive:hover { background: rgba(196,113,74,0.12); }
        .lib-filter-active { background: #C4714A; color: white; box-shadow: 0 2px 8px rgba(196,113,74,0.3); }
        .lib-empty { text-align: center; padding: 60px 20px; color: #9A7E68; font-size: 16px; font-family: 'Cormorant Garamond', serif; font-style: italic; }
        .lib-loading { text-align: center; padding: 60px 20px; color: #9A7E68; font-size: 16px; }
        .lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .lib-card { background: rgba(253,249,244,0.9); border: 1px solid rgba(196,113,74,0.15); border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(44,31,20,0.06); transition: transform 0.2s, box-shadow 0.2s; }
        .lib-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(196,113,74,0.12); }
        .lib-card-top { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(196,113,74,0.08); }
        .lib-type-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: #C4714A; background: rgba(196,113,74,0.08); padding: 4px 10px; border-radius: 20px; }
        .lib-date { font-size: 11px; color: #9A7E68; }
        .lib-media { aspect-ratio: 16/9; background: rgba(232,223,208,0.3); overflow: hidden; }
        .lib-media video { width: 100%; height: 100%; object-fit: cover; }
        .lib-media img { width: 100%; height: 100%; object-fit: cover; }
        .lib-text-preview { padding: 16px; font-size: 13px; color: #6B4F38; line-height: 1.6; height: 100%; overflow: auto; }
        .lib-footer { padding: 12px 16px; border-top: 1px solid rgba(196,113,74,0.08); display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .lib-action-btn { padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
        .lib-btn-img { background: rgba(196,113,74,0.1); color: #A85A36; }
        .lib-btn-img:hover { background: rgba(196,113,74,0.18); }
        .lib-btn-vid { background: rgba(44,31,20,0.06); color: #3A2A1E; }
        .lib-btn-vid:hover { background: rgba(44,31,20,0.12); }
        .lib-btn-dl { background: rgba(196,113,74,0.1); color: #A85A36; }
        .lib-btn-dl:hover { background: rgba(196,113,74,0.18); }
        .lib-btn-del { background: rgba(220,50,50,0.08); color: #C0392B; margin-left: auto; }
        .lib-btn-del:hover { background: rgba(220,50,50,0.15); }
        .lib-btn-del:disabled { opacity: 0.4; cursor: not-allowed; }
        @media (max-width: 640px) {
          .lib-grid { grid-template-columns: 1fr; }
          .lib-header { flex-direction: column; align-items: flex-start; gap: 12px; }
        }
      `}</style>

      <div className="lib-wrap">
        <div className="lib-header">
          <h1 className="lib-title">Your <em>Library</em></h1>
          <button className="lib-refresh" onClick={fetchLibrary}>Refresh</button>
        </div>

        <div className="lib-filters">
          {(["all", "video", "image", "prompt", "plan"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`lib-filter ${filter === f ? "lib-filter-active" : "lib-filter-inactive"}`}
            >
              {TYPE_EMOJI[f] || ""} {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>

        {loading && <div className="lib-loading">Loading your library…</div>}

        {!loading && filteredItems.length === 0 && (
          <div className="lib-empty">
            No {filter === "all" ? "items" : filter + "s"} yet. Start creating!
          </div>
        )}

        {!loading && filteredItems.length > 0 && (
          <div className="lib-grid">
            {filteredItems.map((item) => (
              <div key={item.id} className="lib-card">
                <div className="lib-card-top">
                  <span className="lib-type-badge">
                    {TYPE_EMOJI[item.normalizedType]} {item.normalizedType}
                  </span>
                  <span className="lib-date">{formatDate(item.created_at)}</span>
                </div>

                <div className="lib-media">
                  {item.normalizedType === "video" && item.mediaUrl && (
                    <video src={item.mediaUrl} controls />
                  )}
                  {item.normalizedType === "image" && item.mediaUrl && (
                    <img src={item.mediaUrl} alt="" />
                  )}
                  {(item.normalizedType === "prompt" || item.normalizedType === "plan" || item.normalizedType === "unknown") && (
                    <div className="lib-text-preview">{item.prompt || item.title || "No content"}</div>
                  )}
                </div>

                <div className="lib-footer">
                  {(item.prompt || item.normalizedType === "prompt") && (
                    <>
                      <button className="lib-action-btn lib-btn-img" onClick={() => usePromptForImage(item)}>
                        → Image
                      </button>
                      <button className="lib-action-btn lib-btn-vid" onClick={() => usePromptForVideo(item)}>
                        → Video
                      </button>
                    </>
                  )}
                  {item.mediaUrl && (
                    <button className="lib-action-btn lib-btn-dl" onClick={() => handleDownload(item)}>
                      Download
                    </button>
                  )}
                  <button
                    className="lib-action-btn lib-btn-del"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
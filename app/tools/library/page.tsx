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
        return {
          ...item,
          mediaUrl,
          normalizedType: normalizeType(item, mediaUrl),
        };
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

  if (checkingAuth) {
    return <div className="max-w-6xl mx-auto p-4 text-black">Loading...</div>;
  }

  if (!isAuthed) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4 text-black">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Library</h1>
        <button
          onClick={fetchLibrary}
          className="px-3 py-2 rounded-xl bg-black text-white text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "video", "image", "prompt", "plan"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${
              filter === f
                ? "bg-black text-white"
                : "bg-neutral-100 text-black hover:bg-neutral-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* States */}
      {loading && (
        <div className="py-10 text-center text-neutral-500">Loading...</div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="py-10 text-center text-neutral-500">
          No {filter === "all" ? "items" : filter + "s"} yet.
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="rounded-xl overflow-hidden shadow border bg-white"
          >
            {/* Top */}
            <div className="flex justify-between items-center p-3 border-b">
              <span className="text-xs bg-neutral-100 px-2 py-1 rounded">
                {item.normalizedType}
              </span>
              <span className="text-xs text-neutral-400">
                {formatDate(item.created_at)}
              </span>
            </div>

            {/* Content */}
            <div className="aspect-video bg-neutral-50">
              {item.normalizedType === "video" && item.mediaUrl && (
                <video src={item.mediaUrl} controls className="w-full h-full object-cover" />
              )}
              {item.normalizedType === "image" && item.mediaUrl && (
                <img src={item.mediaUrl} alt="" className="w-full h-full object-cover" />
              )}
              {(item.normalizedType === "prompt" || item.normalizedType === "plan") && (
                <div className="p-3 text-sm overflow-auto h-full text-neutral-700">
                  {item.prompt || item.title}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t space-y-2">
              <div className="flex gap-2 flex-wrap">
                {(item.prompt || item.normalizedType === "prompt") && (
                  <>
                    <button
                      onClick={() => usePromptForImage(item)}
                      className="px-2 py-1 text-xs bg-black text-white rounded"
                    >
                      Use → Image
                    </button>
                    <button
                      onClick={() => usePromptForVideo(item)}
                      className="px-2 py-1 text-xs border rounded"
                    >
                      Use → Video
                    </button>
                  </>
                )}

                {item.mediaUrl && (
                  <button
                    onClick={() => handleDownload(item)}
                    className="px-2 py-1 text-xs bg-neutral-800 text-white rounded"
                  >
                    Download
                  </button>
                )}

                <button
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  className="px-2 py-1 text-xs bg-red-500 text-white rounded disabled:opacity-50 ml-auto"
                >
                  {deletingId === item.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
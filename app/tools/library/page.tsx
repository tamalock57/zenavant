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

  if (url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov")) {
    return "video";
  }

  if (url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".webp")) {
    return "image";
  }

  if (item.prompt && !mediaUrl) return "prompt";

  return "unknown";
}

export default function LibraryPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ✅ AUTH LOCK
  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/");
        return;
      }

      setIsAuthed(true);
      setCheckingAuth(false);
    }

    checkSession();
  }, [router]);

  // ✅ FETCH LIBRARY
  async function fetchLibrary() {
    try {
      setLoading(true);

      const res = await fetch("/api/library");
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to load");
        return;
      }

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
    if (!checkingAuth && isAuthed) {
      fetchLibrary();
    }
  }, [checkingAuth, isAuthed]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // ✅ USE PROMPT
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

  // ✅ DOWNLOAD
  function handleDownload(item: Item) {
    if (!item.mediaUrl) {
      alert("No file available");
      return;
    }

    const link = document.createElement("a");
    link.href = item.mediaUrl;
    link.download = item.title || item.prompt || item.id;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const hasItems = useMemo(() => items.length > 0, [items]);

  // ✅ LOADING FIXED
  if (checkingAuth) {
    return (
      <div className="max-w-6xl mx-auto p-4 text-black">
        Loading...
      </div>
    );
  }

  if (!isAuthed) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4 text-black">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Library</h1>

        <button
          onClick={fetchLibrary}
          className="px-3 py-2 rounded-xl bg-black text-white"
        >
          Refresh
        </button>
      </div>

      {/* STATES */}
      {loading && (
        <div className="py-10 text-center text-neutral-500">
          Loading...
        </div>
      )}

      {!loading && !hasItems && (
        <div className="py-10 text-center text-neutral-500">
          No items yet.
        </div>
      )}

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => {
          const selected = selectedIds.includes(item.id);

          return (
            <div
              key={item.id}
              className={`rounded-xl overflow-hidden shadow border bg-white ${
                selected ? "ring-2 ring-black" : ""
              }`}
            >
              {/* TOP */}
              <div className="flex justify-between p-3 border-b">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSelect(item.id)}
                />

                <span className="text-xs bg-neutral-100 px-2 py-1 rounded">
                  {item.normalizedType}
                </span>
              </div>

              {/* CONTENT */}
              <div className="aspect-video bg-neutral-50">
                {item.normalizedType === "video" && item.mediaUrl && (
                  <video src={item.mediaUrl} controls className="w-full h-full object-cover" />
                )}

                {item.normalizedType === "image" && item.mediaUrl && (
                  <img src={item.mediaUrl} className="w-full h-full object-cover" />
                )}

                {item.normalizedType === "prompt" && (
                  <div className="p-3 text-sm overflow-auto h-full">
                    {item.prompt}
                  </div>
                )}

                {item.normalizedType === "plan" && (
                  <div className="p-3 text-sm overflow-auto h-full">
                    {item.prompt}
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="p-3 border-t space-y-2">
                <div className="text-xs text-neutral-500">
                  {formatDate(item.created_at)}
                </div>

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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
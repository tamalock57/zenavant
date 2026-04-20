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
  metadata?: any;
  created_at?: string | null;
};

type Item = RawItem & {
  mediaUrl: string | null;
  normalizedType: "prompt" | "plan" | "video" | "image" | "unknown";
};

function getPublicUrl(storagePath?: string | null) {
  if (!storagePath) return null;
  const { data } = supabase.storage.from("media").getPublicUrl(storagePath);
  return data?.publicUrl ?? null;
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString();
}

function normalizeItemType(item: RawItem, mediaUrl: string | null): Item["normalizedType"] {
  const type = (item.type || "").toLowerCase().trim();
  const tool = (item.tool || "").toLowerCase().trim();
  const url = (mediaUrl || item.url || "").toLowerCase();

  if (type === "prompt" || tool === "turn-thought-into-prompt") return "prompt";
  if (type === "plan") return "plan";

  if (
    type === "video" ||
    type === "image_to_video" ||
    tool === "image-to-video" ||
    tool === "image_to_video" ||
    url.endsWith(".mp4") ||
    url.endsWith(".webm") ||
    url.endsWith(".mov")
  ) {
    return "video";
  }

  if (
    type === "image" ||
    type === "image-maker" ||
    tool === "image-maker" ||
    tool === "image_maker" ||
    url.endsWith(".png") ||
    url.endsWith(".jpg") ||
    url.endsWith(".jpeg") ||
    url.endsWith(".webp")
  ) {
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
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        router.replace("/");
        return;
      }

      setIsAuthed(true);
      setCheckingAuth(false);
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function fetchLibrary() {
    try {
      setLoading(true);

      const res = await fetch("/api/library", {
        method: "GET",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to load library");
        return;
      }

      const mapped: Item[] = (data.items || []).map((item: RawItem) => {
        const mediaUrl = item.url || getPublicUrl(item.storage_path) || null;
        const normalizedType = normalizeItemType(item, mediaUrl);

        return {
          ...item,
          mediaUrl,
          normalizedType,
        };
      });

      setItems(mapped);
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
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

  function clearSelection() {
    setSelectedIds([]);
  }

  async function handleDeleteSelected() {
    try {
      if (selectedIds.length === 0) return;

      const ok = confirm("Delete selected items?");
      if (!ok) return;

      setDeleting(true);

      const selectedItems = items.filter((item) => selectedIds.includes(item.id));
      const storagePaths = selectedItems
        .map((item) => item.storage_path)
        .filter(Boolean) as string[];

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("media")
          .remove(storagePaths);

        if (storageError) {
          console.error(storageError);
        }
      }

      const { error } = await supabase
        .from("media")
        .delete()
        .in("id", selectedIds);

      if (error) {
        console.error(error);
        alert("Delete failed");
        return;
      }

      clearSelection();
      await fetchLibrary();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function handleDownload(item: Item) {
    if (!item.mediaUrl) {
      alert("This item has no downloadable file.");
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

  if (checkingAuth) {
    return (
      <div className="max-w-6xl mx-auto p-4 text-black">
        Loading...
      </div>
    );
  }

  if (!isAuthed) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4 text-black">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Library</h1>

        <div className="flex gap-2">
          <button
            onClick={fetchLibrary}
            className="px-3 py-2 rounded-xl bg-neutral-800 text-white"
          >
            Refresh
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0 || deleting}
            className="px-3 py-2 rounded-xl bg-red-400 text-white disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {!loading && !hasItems && (
        <div className="py-10 text-center text-neutral-500">
          No items yet.
        </div>
      )}

      {loading && (
        <div className="py-10 text-center text-neutral-500">
          Loading...
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => {
          const selected = selectedIds.includes(item.id);

          return (
            <div
              key={item.id}
              className={`rounded-xl overflow-hidden shadow-sm border border-neutral-300 bg-white ${
                selected ? "ring-2 ring-black" : ""
              }`}
            >
              <div className="flex justify-between items-center p-3 border-b border-neutral-300">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSelect(item.id)}
                />

                <span className="text-xs bg-neutral-100 text-black px-2 py-1 rounded">
                  {item.type || item.normalizedType}
                </span>
              </div>

              <div className="aspect-video bg-neutral-50">
                {item.normalizedType === "prompt" ? (
                  <div className="p-4 text-sm space-y-2 text-black overflow-auto h-full">
                    <div className="text-xs text-neutral-500">
                      {item.tool || "prompt"}
                    </div>

                    <div className="font-semibold">
                      {item.title || "Prompt"}
                    </div>

                    {item.idea ? (
                      <div className="text-xs text-neutral-500">
                        Idea: {item.idea}
                      </div>
                    ) : null}

                    <div className="whitespace-pre-wrap text-sm">
                      {item.prompt || "Saved prompt"}
                    </div>
                  </div>
                ) : item.normalizedType === "plan" ? (
                  <div className="p-4 text-sm text-black overflow-auto h-full">
                    {item.prompt || "Saved plan"}
                  </div>
                ) : item.normalizedType === "video" ? (
                  item.mediaUrl ? (
                    <video
                      src={item.mediaUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-4 text-black">No video available</div>
                  )
                ) : item.normalizedType === "image" ? (
                  item.mediaUrl ? (
                    <img
                      src={item.mediaUrl}
                      alt={item.prompt || item.title || "Saved image"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-4 text-black">No image available</div>
                  )
                ) : (
                  <div className="p-4 text-black overflow-auto h-full">
                    <div className="font-semibold mb-2">
                      {item.title || item.type || "Unknown item"}
                    </div>
                    <div className="text-xs text-neutral-500 mb-2">
                      Tool: {item.tool || "unknown"}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {item.prompt || "This item does not have a renderable preview yet."}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center gap-2 p-3 border-t border-neutral-300">
                <div className="text-xs text-neutral-500">
                  {formatDate(item.created_at)}
                </div>

                {item.mediaUrl ? (
                  <button
                    onClick={() => handleDownload(item)}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 text-white text-xs"
                  >
                    Download
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
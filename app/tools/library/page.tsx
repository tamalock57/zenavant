"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  id: string;
  type: string;
  prompt?: string | null;
  url?: string | null;
  storage_path?: string | null;
  created_at?: string | null;
};

function getPublicUrl(storagePath?: string | null) {
  if (!storagePath) return null;
  const { data } = supabase.storage.from("media").getPublicUrl(storagePath);
  return data?.publicUrl ?? null;
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString();
}

export default function LibraryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadLibrary(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      const { data, error } = await supabase
        .from("media")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setItems(data || []);
    } catch (err) {
      console.error("Load failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshLibrary() {
    setRefreshing(true);
    await loadLibrary(true);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedIds(items.map((item) => item.id));
  }

  function deselectAll() {
    setSelectedIds([]);
  }

  async function handleDelete(item: Item) {
    const confirmed = window.confirm("Delete this item?");
    if (!confirmed) return;

    try {
      setDeletingId(item.id);

      if (item.storage_path) {
        await supabase.storage.from("media").remove([item.storage_path]);
      }

      await supabase.from("media").delete().eq("id", item.id);

      setItems((prev) => prev.filter((x) => x.id !== item.id));
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadLibrary(true);
  }, []);

  const preparedItems = useMemo(() => {
    return items.map((item) => {
      const mediaUrl = item.url || getPublicUrl(item.storage_path);
      const type = (item.type || "").toLowerCase();

      return {
        ...item,
        mediaUrl,
        isVideo: type.includes("video"),
        isImage: type.includes("image"),
        isPlan: type.includes("plan") || type === "text",
      };
    });
  }, [items]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Library</h1>
        <p className="text-sm text-gray-600">
          Your saved images, videos, and plans.
        </p>
      </div>

      {/* ACTION BAR */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={refreshLibrary}
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>

        <button
          onClick={selectAll}
          className="bg-gray-100 px-3 py-2 rounded-lg text-sm"
        >
          Select All
        </button>

        <button
          onClick={deselectAll}
          className="bg-gray-100 px-3 py-2 rounded-lg text-sm"
        >
          Deselect All
        </button>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {preparedItems.map((item) => {
            const selected = selectedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`border rounded-xl overflow-hidden shadow-sm ${
                  selected ? "ring-2 ring-black" : ""
                }`}
              >
                {/* SELECT ROW */}
                <div className="flex justify-between items-center p-3 border-b">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(item.id)}
                  />

                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {item.type}
                  </span>
                </div>

                {/* MEDIA */}
                <div className="aspect-video bg-gray-100">
                  {item.isPlan ? (
                    <div className="p-4 text-sm">
                      {item.prompt || "Saved plan"}
                    </div>
                  ) : item.isVideo ? (
                    item.mediaUrl ? (
                      <video
                        src={item.mediaUrl}
                        controls
                        onError={(e) => {
                          console.error("Video error:", item);
                          e.currentTarget.style.display = "none";
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-gray-500">
                        Broken video
                      </div>
                    )
                  ) : item.isImage ? (
                    item.mediaUrl ? (
                      <img
                        src={item.mediaUrl}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-gray-500">
                        Broken image
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-500">
                      Unknown media
                    </div>
                  )}
                </div>

                {/* DETAILS */}
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-2">
                    {formatDate(item.created_at)}
                  </p>

                  <p className="text-sm mb-4">
                    {item.prompt || "No prompt"}
                  </p>

                  <div className="flex gap-2">
                    {item.mediaUrl && !item.isPlan && (
                      <a
                        href={item.mediaUrl}
                        target="_blank"
                        className="bg-gray-100 px-3 py-2 rounded-lg text-sm"
                      >
                        Download
                      </a>
                    )}

                    <button
                      onClick={() => handleDelete(item)}
                      className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm"
                    >
                      {deletingId === item.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  {item.isPlan && (
                    <Link
                      href="/tools/turn-thought-into-plan"
                      className="inline-block mt-3 text-sm text-blue-600"
                    >
                      Open Plan →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  id: string;
  type: string;
  title?: string | null;
  idea?: string | null;
  prompt?: string | null;
  url?: string | null;
  storage_path?: string | null;
  tool?: string | null;
  metadata?: any;
  created_at?: string | null;

  // derived
  mediaUrl?: string | null;
  isVideo?: boolean;
  isPlan?: boolean;
};

function getPublicUrl(storagePath?: string | null) {
  if (!storagePath) return null;
  const { data } = supabase.storage.from("media").getPublicUrl(storagePath);
  return data?.publicUrl ?? null;
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown date";
  const d = new Date(value);
  return d.toLocaleDateString();
}

export default function LibraryPage() {
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 🔹 fetch library
  async function fetchLibrary() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("media")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        alert("Failed to load library");
        return;
      }

      const mapped: Item[] =
        data?.map((item: any) => {
          const mediaUrl =
            item.url || getPublicUrl(item.storage_path) || null;

          return {
            ...item,
            mediaUrl,
            isVideo: item.type === "video",
            isPlan: item.type === "plan",
          };
        }) || [];

      setItems(mapped);
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLibrary();
  }, []);

  // 🔹 selection
  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  // 🔹 delete
  async function handleDeleteSelected() {
    try {
      if (selectedIds.length === 0) return;

      const confirmDelete = confirm("Delete selected items?");
      if (!confirmDelete) return;

      const toDelete = items.filter((i) =>
        selectedIds.includes(i.id)
      );

      // delete storage files
      const paths = toDelete
        .map((i) => i.storage_path)
        .filter(Boolean) as string[];

      if (paths.length > 0) {
        await supabase.storage.from("media").remove(paths);
      }

      // delete db rows
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
      fetchLibrary();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  }

  const hasItems = useMemo(() => items.length > 0, [items]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4 text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Library</h1>

        <div className="flex gap-2">
          <button
            onClick={fetchLibrary}
            className="px-3 py-2 rounded-xl bg-neutral-800"
          >
            Refresh
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className="px-3 py-2 rounded-xl bg-red-600 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {!hasItems && !loading && (
        <div className="text-center text-neutral-400 py-10">
          No items yet.
        </div>
      )}

      {loading && (
        <div className="text-center text-neutral-400 py-10">
          Loading...
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

        {items.map((item) => {
          const selected = selectedIds.includes(item.id);

          return (
            <div
              key={item.id}
              className={`rounded-xl overflow-hidden shadow-sm border ${
                selected ? "ring-2 ring-black" : ""
              }`}
            >
              {/* HEADER */}
              <div className="flex justify-between items-center p-3 border-b bg-neutral-900">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSelect(item.id)}
                />

                <span className="text-xs bg-gray-100 text-black px-2 py-1 rounded">
                  {item.type}
                </span>
              </div>

              {/* CONTENT */}
              <div className="aspect-video bg-gray-100">

                {/* 🔥 PROMPT */}
                {item.type === "prompt" ? (
                  <div className="p-4 text-sm space-y-2 text-black">
                    <div className="text-xs text-gray-500">
                      {item.tool || "prompt"}
                    </div>

                    <div className="font-semibold">
                      {item.title || "Prompt"}
                    </div>

                    {item.idea && (
                      <div className="text-xs text-gray-500">
                        Idea: {item.idea}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap text-sm">
                      {item.prompt || "Saved prompt"}
                    </div>
                  </div>

                /* 🔹 PLAN */
                ) : item.isPlan ? (
                  <div className="p-4 text-sm text-black">
                    {item.prompt || "Saved plan"}
                  </div>

                /* 🔹 VIDEO */
                ) : item.isVideo ? (
                  item.mediaUrl ? (
                    <video
                      src={item.mediaUrl}
                      controls
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("Video error:", item);
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="p-4 text-black">No video</div>
                  )

                /* 🔹 IMAGE */
                ) : item.mediaUrl ? (
                  <img
                    src={item.mediaUrl}
                    alt={item.prompt || "Saved image"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("Image error:", item);
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="p-4 text-black">No image</div>
                )}
              </div>

              {/* FOOTER */}
              <div className="p-3 text-xs text-neutral-400 bg-neutral-900">
                {formatDate(item.created_at)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
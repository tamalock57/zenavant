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
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadLibrary() {
    try {
      setError(null);

      const { data, error } = await supabase
        .from("media")
        .select("id, type, prompt, url, storage_path, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setItems(data ?? []);
    } catch (err) {
      console.error("Library load failed:", err);
      setError("Could not load library.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshLibrary() {
    setRefreshing(true);
    await loadLibrary();
  }

  async function handleDelete(item: Item) {
    const confirmed = window.confirm("Delete this item from the library?");
    if (!confirmed) return;

    try {
      setDeletingId(item.id);

      if (item.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("media")
          .remove([item.storage_path]);

        if (storageError) {
          console.warn("Storage delete warning:", storageError.message);
        }
      }

      const { error: dbError } = await supabase
        .from("media")
        .delete()
        .eq("id", item.id);

      if (dbError) throw dbError;

      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadLibrary();
  }, []);

  const preparedItems = useMemo(() => {
    return items.map((item) => {
      const mediaUrl = item.url || getPublicUrl(item.storage_path);
      const normalizedType = (item.type || "").toLowerCase();

      const isPlan =
        normalizedType.includes("plan") ||
        normalizedType === "text" ||
        normalizedType === "thought-plan";

      const isVideo = normalizedType.includes("video");
      const isImage = normalizedType.includes("image");

      return {
        ...item,
        mediaUrl,
        isPlan,
        isVideo,
        isImage,
      };
    });
  }, [items]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your saved images, videos, and plans.
          </p>
        </div>

        <button
          onClick={refreshLibrary}
          disabled={refreshing}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-8 text-sm text-gray-600 shadow-sm">
          Loading library...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : preparedItems.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-sm text-gray-600 shadow-sm">
          No media yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {preparedItems.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border bg-white shadow-sm"
            >
              <div className="aspect-video bg-gray-100">
                {item.isPlan ? (
                  <div className="flex h-full flex-col justify-between p-5">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Plan
                      </div>
                      <p className="line-clamp-6 text-sm leading-6 text-gray-800">
                        {item.prompt || "Saved plan"}
                      </p>
                    </div>

                    <div className="mt-4">
                      <Link
                        href="/tools/turn-thought-into-plan"
                        className="inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        Open Plan Tool
                      </Link>
                    </div>
                  </div>
                ) : item.isVideo && item.mediaUrl ? (
                  <video
                    src={item.mediaUrl}
                    controls
                    className="h-full w-full object-cover"
                  />
                ) : item.isImage && item.mediaUrl ? (
                  <img
                    src={item.mediaUrl}
                    alt="Saved media"
                    className="h-full w-full object-cover"
                  />
                ) : item.mediaUrl ? (
                  <img
                    src={item.mediaUrl}
                    alt="Saved media"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500">
                    Broken media source
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {item.type || "unknown"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(item.created_at)}
                  </span>
                </div>

                {!item.isPlan && (
                  <p className="mb-4 line-clamp-3 text-sm leading-6 text-gray-700">
                    {item.prompt || "No prompt saved."}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {item.mediaUrl && !item.isPlan && (
                    <a
                      href={item.mediaUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-200"
                    >
                      Download
                    </a>
                  )}

                  <button
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
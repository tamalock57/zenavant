"use client";

import { useEffect, useState } from "react";

type MediaItem = {
  id: string;
  type: string;
  url: string;
  storage_path?: string | null;
  prompt?: string | null;
};

export default function Page() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  async function load() {
    const res = await fetch("/api/library", {
      cache: "no-store",
    });

    const data = await res.json();
    setMedia(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(id?: string) {
    if (!id) return;

    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    const ids = media.map((m) => m.id).filter(Boolean);
    setSelected(ids);
  }

  function deselectAll() {
    setSelected([]);
  }

  async function deleteSelected() {
    for (const m of media) {
      if (m.id && selected.includes(m.id)) {
        await fetch("/api/library/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: m.id,
            storage_path: m.storage_path,
          }),
        });
      }
    }

    setSelected([]);
    await load();
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Library</h1>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <button
          onClick={selectAll}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.16)",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Select All
        </button>

        <button
          onClick={deselectAll}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.16)",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Deselect
        </button>

        <button
          onClick={deleteSelected}
          disabled={selected.length === 0}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.16)",
            background: selected.length === 0 ? "rgba(0,0,0,0.08)" : "#111",
            color: selected.length === 0 ? "#444" : "#fff",
            cursor: selected.length === 0 ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          Delete
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {Array.isArray(media) &&
          media.map((m) => (
            <div
              key={m.id}
              style={{
                border: selected.includes(m.id)
                  ? "2px solid #111"
                  : "1px solid #ccc",
                borderRadius: 12,
                padding: 10,
                background: "#fff",
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={m.id ? selected.includes(m.id) : false}
                    onChange={() => toggle(m.id)}
                    style={{ marginRight: 6 }}
                  />
                  Select
                </label>
              </div>

              {m.type === "video" ? (
                <video
                  src={m.url}
                  controls
                  style={{ width: "100%", borderRadius: 8 }}
                />
              ) : (
                <img
                  src={m.url}
                  alt={m.prompt ?? "Library item"}
                  style={{ width: "100%", borderRadius: 8 }}
                />
              )}
            </div>
          ))}
      </div>
    </main>
  );
}
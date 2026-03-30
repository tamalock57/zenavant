"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  type: string;
  url?: string | null;
  storage_path?: string | null;
  prompt?: string | null;
  item_kind?: string;
  created_at?: string;
};

export default function LibraryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  async function load() {
    const res = await fetch("/api/library", {
      cache: "no-store",
    });

    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelected(items.map((i) => i.id));
  }

  function deselectAll() {
    setSelected([]);
  }

  async function deleteSelected() {
    for (const item of items) {
      if (selected.includes(item.id)) {
        await fetch("/api/library/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            storage_path: item.storage_path,
          }),
        });
      }
    }

    setSelected([]);
    await load();
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Library</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={selectAll}>Select All</button>
        <button onClick={deselectAll}>Deselect</button>
        <button onClick={deleteSelected} disabled={selected.length === 0}>
          Delete
        </button>
      </div>

      {items.length === 0 ? (
        <div>No items yet.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: selected.includes(item.id)
                  ? "2px solid #111"
                  : "1px solid #ccc",
                borderRadius: 12,
                padding: 10,
                background: "#fff",
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span style={{ marginLeft: 6 }}>Select</span>
              </div>

              {item.type === "video" && item.url ? (
                <video
                  src={item.url}
                  controls
                  style={{ width: "100%", borderRadius: 8 }}
                />
              ) : item.type === "image" && item.url ? (
                <img
                  src={item.url}
                  alt="Library item"
                  style={{ width: "100%", borderRadius: 8 }}
                />
              ) : item.type === "plan" ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.05)",
                    fontSize: 14,
                  }}
                >
                  <b>Plan</b>
                  <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                    {item.prompt || "No content"}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.05)",
                    textAlign: "center",
                    fontSize: 14,
                    opacity: 0.7,
                  }}
                >
                  Unsupported or missing media
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
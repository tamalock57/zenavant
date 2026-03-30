"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  type: string;
  url?: string | null;
  storage_path?: string | null;
  prompt?: string | null;
  content?: string | null;
  plan?: string | null;
  summary?: string | null;
  title?: string | null;
  item_kind?: string;
  created_at?: string;
};

export default function LibraryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch("/api/library", {
        cache: "no-store",
      });

      const data = await res.json();

      if (Array.isArray(data?.items)) {
        setItems(data.items);
      } else if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function selectAll() {
    setSelected(items.map((i) => i.id));
  }

  function deselectAll() {
    setSelected([]);
  }

  async function deleteSelected() {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} item(s)?`)) return;

    try {
      setDeleting(true);

      for (const item of items) {
        if (!selected.includes(item.id)) continue;

        const route =
          item.type === "plan" || item.item_kind === "plan"
            ? "/api/library/delete-plan"
            : "/api/library/delete";

        await fetch(route, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            storage_path: item.storage_path,
          }),
        });
      }

      setSelected([]);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  function getPlanText(item: Item) {
    return (
      item.prompt ||
      item.content ||
      item.plan ||
      item.summary ||
      "No content"
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 16 }}>Library</h1>

      {/* ACTION BAR */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={selectAll}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            background: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Select All
        </button>

        <button
          onClick={deselectAll}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            background: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Deselect All
        </button>

        <button
          onClick={deleteSelected}
          disabled={selected.length === 0 || deleting}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            background:
              selected.length === 0 || deleting ? "#ddd" : "#111",
            color:
              selected.length === 0 || deleting ? "#666" : "#fff",
            fontWeight: 600,
            cursor:
              selected.length === 0 || deleting
                ? "not-allowed"
                : "pointer",
          }}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div>Loading...</div>
      ) : items.length === 0 ? (
        <div>No items yet.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
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
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              {/* SELECT */}
              <div style={{ marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span style={{ marginLeft: 6 }}>Select</span>
              </div>

              {/* VIDEO */}
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
              ) : item.type === "plan" ||
                item.item_kind === "plan" ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.05)",
                    fontSize: 14,
                  }}
                >
                  <b>{item.title || "Plan"}</b>
                  <div
                    style={{
                      marginTop: 6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {getPlanText(item)}
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
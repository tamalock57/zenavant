"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [media, setMedia] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  async function load() {
    const res = await fetch("/api/library");
    const data = await res.json();
    setMedia(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelected(media.map((m) => m.id));
  }

  function deselectAll() {
    setSelected([]);
  }

  async function deleteSelected() {
    for (const m of media) {
      if (selected.includes(m.id)) {
        await fetch("/api/library/delete", {
          method: "POST",
          body: JSON.stringify({
            id: m.id,
            storage_path: m.storage_path,
          }),
        });
      }
    }
    setSelected([]);
    load();
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Library</h1>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={selectAll}>Select All</button>
        <button onClick={deselectAll}>Deselect</button>
        <button onClick={deleteSelected}>Delete</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {media.map((m) => (
          <div key={m.id} style={{ border: "1px solid #ccc", padding: 10 }}>
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              onChange={() => toggle(m.id)}
            />

            {m.type === "video" ? (
              <video src={m.url} controls />
            ) : (
              <img src={m.url} />
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
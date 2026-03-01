"use client";

import { useEffect, useState } from "react";

type MediaItem = {
  id: string;
  type: string;
  prompt: string;
  url: string;
  created_at: string;
};

export default function LibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMedia() {
    try {
      const res = await fetch("/api/library");

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to load");
        return;
      }

      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMedia();
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      
      <h1 style={{ fontSize: 34, fontWeight: 750 }}>
        Zenavant Library
      </h1>

      <p style={{ opacity: 0.8 }}>
        Everything Zenavant has created.
      </p>

      {loading && (
        <p>Loading...</p>
      )}

      {error && (
        <p style={{ color: "red" }}>{error}</p>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px,1fr))",
        gap: 16,
        marginTop: 20
      }}>

        {items.map((item) => (

          <div key={item.id}
            style={{
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: 12,
              padding: 12,
              background: "white"
            }}
          >

            <div style={{
              fontSize: 12,
              opacity: 0.6,
              marginBottom: 6
            }}>
              {item.type}
            </div>

            {item.type === "image" && (

              <img
                src={item.url}
                style={{
                  width: "100%",
                  borderRadius: 10
                }}
              />

            )}

            {item.type === "video" && (

              <video
                controls
                src={item.url}
                style={{
                  width: "100%",
                  borderRadius: 10
                }}
              />

            )}

            <div style={{
              marginTop: 8,
              fontSize: 13,
              opacity: 0.8
            }}>
              {item.prompt}
            </div>

          </div>

        ))}

      </div>

    </main>
  );
}
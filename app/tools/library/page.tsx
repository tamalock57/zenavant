"use client";

import { useEffect, useState } from "react";

type MediaItem = {
  id?: string | number;
  type?: string;
  url?: string;
  prompt?: string;
  storage_path?: string;
  created_at?: string;
};

type PlanItem = {
  id?: string | number;
  title?: string;
  summary?: string;
  steps?: string[];
  firstTinyAction?: string;
  encouragement?: string;
};

export default function LibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadLibrary() {
    try {
      setError("");

      const res = await fetch("/api/library", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to load library.");
        setMedia([]);
        setPlans([]);
        return;
      }

      setMedia(Array.isArray(data.media) ? data.media : []);
      setPlans(Array.isArray(data.plans) ? data.plans : []);
    } catch (err: any) {
      setError(err?.message || "Library load failed.");
      setMedia([]);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }

  async function refreshLibrary() {
    try {
      setRefreshing(true);
      await loadLibrary();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete(item: MediaItem) {
    const confirmDelete = confirm("Delete this item?");
    if (!confirmDelete) return;

    await fetch("/api/library/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: item.id,
        storage_path: item.storage_path,
      }),
    });

    await loadLibrary();
  }

  useEffect(() => {
    loadLibrary();
  }, []);

  const isEmpty = media.length === 0 && plans.length === 0;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 32, margin: 0 }}>Library</h1>
          <p style={{ opacity: 0.7 }}>
            Your creations and saved plans
          </p>
        </div>

        <button
          onClick={refreshLibrary}
          disabled={refreshing}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* STATES */}
      {loading && <p>Loading...</p>}

      {!loading && error && (
        <p style={{ color: "red" }}>{error}</p>
      )}

      {!loading && !error && isEmpty && (
        <p>No creations yet.</p>
      )}

      {/* MEDIA */}
      {!loading && media.length > 0 && (
        <>
          <h2>Media</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 30,
            }}
          >
            {media.map((item, index) => (
              <div
                key={item.id ?? index}
                style={{
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 10,
                }}
              >
                {item.type === "video" ? (
                  <video
                    src={item.url}
                    controls
                    style={{ width: "100%" }}
                  />
                ) : (
                  <img
                    src={item.url}
                    alt=""
                    style={{ width: "100%" }}
                  />
                )}

                {item.prompt && (
                  <p style={{ fontSize: 13 }}>{item.prompt}</p>
                )}

                {/* ✅ DELETE BUTTON */}
                <button
                  onClick={() => handleDelete(item)}
                  style={{
                    marginTop: 8,
                    padding: "6px 10px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    background: "#ffdddd",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PLANS */}
      {!loading && plans.length > 0 && (
        <>
          <h2>Plans</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {plans.map((plan, index) => (
              <div
                key={plan.id ?? index}
                style={{
                  padding: 14,
                  border: "1px solid #ddd",
                  borderRadius: 10,
                }}
              >
                <h3>{plan.title}</h3>

                {plan.summary && <p>{plan.summary}</p>}

                {plan.steps && (
                  <ol>
                    {plan.steps.slice(0, 4).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                )}

                {plan.firstTinyAction && (
                  <p>
                    <strong>First step:</strong>{" "}
                    {plan.firstTinyAction}
                  </p>
                )}

                {plan.encouragement && (
                  <p style={{ fontStyle: "italic" }}>
                    {plan.encouragement}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
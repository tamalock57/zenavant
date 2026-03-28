"use client";

import { useEffect, useState } from "react";

type MediaItem = {
  id?: string | number;
  type?: string;
  url?: string;
  prompt?: string;
  storage_path?: string;
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
  const [lastRefreshed, setLastRefreshed] = useState("");

  async function loadLibrary(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      const res = await fetch("/api/library", {
        cache: "no-store",
      });

      const data = await res.json();

      setMedia(Array.isArray(data.media) ? data.media : []);
      setPlans(Array.isArray(data.plans) ? data.plans : []);
      setLastRefreshed(new Date().toLocaleTimeString());
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function refreshLibrary() {
    try {
      setRefreshing(true);
      await loadLibrary(false);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDeleteMedia(item: MediaItem) {
    if (!confirm("Delete this item?")) return;

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

    await loadLibrary(false);
  }

  async function handleDeletePlan(plan: PlanItem) {
    if (!confirm("Delete this plan?")) return;

    await fetch("/api/library/delete-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: plan.id,
      }),
    });

    await loadLibrary(false);
  }

  async function handleDownload(item: MediaItem) {
    if (!item.url) return;

    const res = await fetch(item.url);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `zenavant-${item.id || Date.now()}`;
    a.click();

    window.URL.revokeObjectURL(url);
  }

  useEffect(() => {
    loadLibrary();
  }, []);

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 20,
        fontFamily: "system-ui",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4 }}>Library</h1>
        <p style={{ opacity: 0.6 }}>Your creations and saved plans</p>

        <div style={{ marginTop: 10 }}>
          <button
            onClick={refreshLibrary}
            disabled={refreshing}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.1)",
              background: refreshing ? "#ddd" : "#111",
              color: refreshing ? "#666" : "#fff",
              cursor: "pointer",
            }}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          {lastRefreshed && (
            <p style={{ fontSize: 12, opacity: 0.5, marginTop: 6 }}>
              Last refreshed: {lastRefreshed}
            </p>
          )}
        </div>
      </div>

      {loading && <p>Loading...</p>}

      {/* MEDIA */}
      {media.length > 0 && (
        <>
          <h2 style={{ marginBottom: 12 }}>Media</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 30,
            }}
          >
            {media.map((item, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 10,
                  background: "#fff",
                }}
              >
                {item.type === "video" ? (
                  <video
                    src={item.url}
                    controls
                    style={{ width: "100%", borderRadius: 8 }}
                  />
                ) : (
                  <img
                    src={item.url}
                    style={{ width: "100%", borderRadius: 8 }}
                  />
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <button
                    onClick={() => handleDownload(item)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      background: "#eef4ff",
                      cursor: "pointer",
                    }}
                  >
                    Download
                  </button>

                  <button
                    onClick={() => handleDeleteMedia(item)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      background: "#ffe3e3",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PLANS */}
      {plans.length > 0 && (
        <>
          <h2 style={{ marginBottom: 12 }}>Plans</h2>

          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            {plans.map((plan, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 14,
                  background: "#fff",
                }}
              >
                <h3 style={{ marginBottom: 6 }}>{plan.title}</h3>
                <p style={{ opacity: 0.7 }}>{plan.summary}</p>

                {plan.steps && (
                  <ul style={{ marginTop: 8 }}>
                    {plan.steps.slice(0, 4).map((s, j) => (
                      <li key={j}>{s}</li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => handleDeletePlan(plan)}
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    background: "#ffe3e3",
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
    </main>
  );
}
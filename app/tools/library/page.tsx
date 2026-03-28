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
  const [error, setError] = useState("");

  async function loadLibrary(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

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
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err?.message || "Library load failed.");
      setMedia([]);
      setPlans([]);
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

    await loadLibrary(false);
  }

  async function handleDeletePlan(plan: PlanItem) {
    const confirmDelete = confirm("Delete this plan?");
    if (!confirmDelete) return;

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
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h1>Library</h1>
        <p style={{ opacity: 0.7 }}>Your creations and saved plans</p>

        <button onClick={refreshLibrary} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>

        {lastRefreshed && (
          <p style={{ fontSize: 12, opacity: 0.5 }}>
            Last refreshed: {lastRefreshed}
          </p>
        )}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* MEDIA */}
      {media.length > 0 && (
        <>
          <h2>Media</h2>

          {media.map((item, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              {item.type === "video" ? (
                <video src={item.url} controls width="100%" />
              ) : (
                <img src={item.url} width="100%" />
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => handleDownload(item)}>
                  Download
                </button>

                <button onClick={() => handleDeleteMedia(item)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* PLANS */}
      {plans.length > 0 && (
        <>
          <h2>Plans</h2>

          {plans.map((plan, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #ccc",
                padding: 12,
                marginBottom: 12,
              }}
            >
              <h3>{plan.title}</h3>
              <p>{plan.summary}</p>

              {plan.steps && (
                <ul>
                  {plan.steps.slice(0, 4).map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ul>
              )}

              <button onClick={() => handleDeletePlan(plan)}>
                Delete
              </button>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
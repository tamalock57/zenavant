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
  const [message, setMessage] = useState("");

  async function loadLibrary(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setMessage("");

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
      setMessage("Library refreshed.");
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
    setMessage("Media deleted.");
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
    setMessage("Plan deleted.");
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
    setMessage("Download started.");
  }

  function buildPlanPrompt(plan: PlanItem) {
    return [
      plan.title || "",
      plan.summary || "",
      ...(plan.steps || []),
      plan.firstTinyAction || "",
      plan.encouragement || "",
    ]
      .join(" ")
      .trim();
  }

  function usePlanForImage(plan: PlanItem) {
    const prompt = buildPlanPrompt(plan);
    if (!prompt) return;

    localStorage.setItem("zenavant_prompt", prompt);
    window.location.href = "/tools/image-maker";
  }

  function usePlanForVideo(plan: PlanItem) {
    const prompt = buildPlanPrompt(plan);
    if (!prompt) return;

    localStorage.setItem("zenavant_prompt", prompt);
    window.location.href = "/tools/video-maker";
  }

  async function copyPlan(plan: PlanItem) {
    const text = [
      plan.title || "",
      plan.summary || "",
      ...(plan.steps || []),
      plan.firstTinyAction ? `First tiny action: ${plan.firstTinyAction}` : "",
      plan.encouragement || "",
    ]
      .filter(Boolean)
      .join("\n");

    await navigator.clipboard.writeText(text);
    setMessage("Plan copied.");
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4 }}>Library</h1>
        <p style={{ opacity: 0.6 }}>Your creations and saved plans</p>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
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
            <span style={{ fontSize: 12, opacity: 0.5 }}>
              Last refreshed: {lastRefreshed}
            </span>
          )}
        </div>

        {message && (
          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>{message}</p>
        )}
      </div>

      {loading && <p>Loading...</p>}

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
                    alt=""
                    style={{ width: "100%", borderRadius: 8 }}
                  />
                )}

                {item.prompt && (
                  <p style={{ marginTop: 10, fontSize: 13, opacity: 0.72 }}>
                    {item.prompt}
                  </p>
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

                {plan.firstTinyAction && (
                  <p style={{ fontSize: 14, opacity: 0.8 }}>
                    <strong>First tiny action:</strong> {plan.firstTinyAction}
                  </p>
                )}

                {plan.encouragement && (
                  <p style={{ fontStyle: "italic", opacity: 0.7 }}>
                    {plan.encouragement}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => usePlanForImage(plan)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      background: "#eef4ff",
                      cursor: "pointer",
                    }}
                  >
                    Use for image
                  </button>

                  <button
                    onClick={() => usePlanForVideo(plan)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      background: "#f3f0ff",
                      cursor: "pointer",
                    }}
                  >
                    Use for video
                  </button>

                  <button
                    onClick={() => copyPlan(plan)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      background: "#f5f5f5",
                      cursor: "pointer",
                    }}
                  >
                    Copy
                  </button>

                  <button
                    onClick={() => handleDeletePlan(plan)}
                    style={{
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
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
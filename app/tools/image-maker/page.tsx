"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ImageMakerPage() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = prompt.trim().length >= 5;

  // Protect page
  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
      }
    }

    checkUser();
  }, [router]);

  // Restore prompt passed from another page
  useEffect(() => {
    const saved = localStorage.getItem("zenavant_prompt");
    if (saved) {
      setPrompt(saved);
      localStorage.removeItem("zenavant_prompt");
    }
  }, []);

  async function generate() {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setImage(null);

    try {
      const res = await fetch("/api/image-maker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Request failed");
        return;
      }

      console.log("image-maker response:", data);
      setImage(data.imageUrl || data.image || null);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // keep the rest of your existing file below this line

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 34, fontWeight: 750, marginBottom: 6 }}>
        Image Maker
      </h1>

      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Describe an image. Zenavant generates it.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          background: "rgba(255,255,255,0.9)",
        }}
      >
        <label
          style={{ display: "block", fontWeight: 650, marginBottom: 8 }}
        >
          Prompt
        </label>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: A calm minimalist workspace with a notebook and soft morning light."
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.18)",
            outline: "none",
            background: "#fff",
            color: "#111",
            resize: "vertical",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 12,
            alignItems: "center",
          }}
        >
          <label style={{ fontSize: 14, opacity: 0.85 }}>Size</label>

          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "#fff",
            }}
          >
            <option value="1024x1024">1024x1024 (square)</option>
            <option value="1024x1536">1024x1536 (portrait)</option>
            <option value="1536x1024">1536x1024 (landscape)</option>
          </select>

          <button
            onClick={generate}
            disabled={loading || !canSubmit}
            style={{
              marginLeft: "auto",
              padding: "10px 14px",
              fontSize: 16,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background:
                loading || !canSubmit ? "rgba(0,0,0,0.08)" : "#111",
              color: loading || !canSubmit ? "#444" : "#fff",
              cursor: loading || !canSubmit ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate image"}
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(220, 38, 38, 0.35)",
              background: "rgba(220, 38, 38, 0.06)",
              color: "#7f1d1d",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {image && (
        <section
          style={{
            marginTop: 18,
            padding: 16,
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.9)",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 750, marginTop: 0 }}>
            Result
          </h2>

          <img
            src={image}
            alt="Generated"
            style={{
              marginTop: 10,
              width: "100%",
              height: "auto",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />
        </section>
      )}
    </main>
  );
}
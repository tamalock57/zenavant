"use client";

import { useMemo, useState } from "react";

const SIZE_OPTIONS = [
  { value: "1024x1024", label: "1024x1024 (Square)" },
  { value: "1536x1024", label: "1536x1024 (Landscape)" },
  { value: "1024x1536", label: "1024x1536 (Portrait)" },
];

export default function ImageMakerPage() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mainPreview = useMemo(() => {
    return mainImage ? URL.createObjectURL(mainImage) : null;
  }, [mainImage]);

  const referencePreviews = useMemo(() => {
    return referenceImages.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  }, [referenceImages]);

  async function generate() {
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      if (!prompt.trim()) {
        setError("Please enter a prompt.");
        setLoading(false);
        return;
      }

      const fd = new FormData();
      fd.append("prompt", prompt);
      fd.append("size", size);

      if (mainImage) {
        fd.append("mainImage", mainImage);
      }

      referenceImages.forEach((file) => {
        fd.append("referenceImages", file);
      });

      const res = await fetch("/api/image-maker", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Image generation failed");
      }

      setImageUrl(data.url);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 34, fontWeight: 750, marginBottom: 6 }}>
        Image Maker
      </h1>

      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Generate a new image from a prompt, with optional reference images.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <div>
          <label style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to create..."
            rows={5}
            style={{
              width: "100%",
              padding: 12,
              fontSize: 16,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>
            Size
          </label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            style={{
              padding: "10px 12px",
              fontSize: 16,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "#fff",
            }}
          >
            {SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>
            Main Image (optional)
          </label>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={(e) => setMainImage(e.target.files?.[0] ?? null)}
          />
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
            {mainImage?.name || "No main image selected"}
          </div>

          {mainPreview && (
            <div style={{ marginTop: 12 }}>
              <img
                src={mainPreview}
                alt="Main preview"
                style={{
                  width: 180,
                  height: 180,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                }}
              />
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>
            Extra Reference Images (optional)
          </label>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            multiple
            onChange={(e) =>
              setReferenceImages(Array.from(e.target.files || []))
            }
          />
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
            {referenceImages.length > 0
              ? `${referenceImages.length} reference image(s) selected`
              : "No reference images selected"}
          </div>

          {referencePreviews.length > 0 && (
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: 12,
              }}
            >
              {referencePreviews.map((item) => (
                <div key={`${item.name}-${item.url}`}>
                  <img
                    src={item.url}
                    alt={item.name}
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      objectFit: "cover",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                    }}
                  />
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      opacity: 0.75,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={generate}
          disabled={loading}
          style={{
            marginTop: 16,
            padding: "10px 14px",
            fontSize: 16,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.2)",
            background: loading ? "rgba(0,0,0,0.08)" : "#111",
            color: loading ? "#444" : "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Generating..." : "Generate Image"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(220,38,38,0.25)",
              background: "rgba(254,242,242,1)",
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {imageUrl && (
        <section
          style={{
            marginTop: 18,
            padding: 16,
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            background: "#fff",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 750, marginTop: 0 }}>
            Result
          </h2>
          <img
            src={imageUrl}
            alt="Generated result"
            style={{
              width: "100%",
              borderRadius: 10,
              marginTop: 10,
            }}
          />
        </section>
      )}
    </main>
  );
}

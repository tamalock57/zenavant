"use client";

// ✅ C1) Add state (put these near your other useState lines)
const [prompt, setPrompt] = useState("");
const [generating, setGenerating] = useState(false);
const [result, setResult] = useState<string | null>(null);

// ✅ C2) Add generate function (put this under your useEffect blocks)
const handleGenerate = async () => {
  if (!prompt.trim()) return;

  setGenerating(true);
  setResult(null);

  // Placeholder logic for now
  setTimeout(() => {
    setResult(`Generated result for: "${prompt}"`);
    setGenerating(false);
  }, 1000);
};

// ✅ C3) Replace the “Generation will live here next” section with this
<div className="border rounded p-6 space-y-4">
  <h2 className="font-medium">Generate</h2>

  <input
    className="w-full rounded border px-3 py-2"
    placeholder="Describe what you want to create..."
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
  />

  <button
    className="rounded bg-black text-white px-4 py-2"
    onClick={handleGenerate}
    disabled={generating}
  >
    {generating ? "Generating..." : "Generate"}
  </button>

  {result && (
    <div className="border rounded p-3 text-sm">
      {result}
    </div>
  )}
</div>

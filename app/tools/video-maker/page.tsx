"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type JobStatus = "queued" | "in_progress" | "completed" | "failed";

type VideoResult = {
  jobId: string;
  status: JobStatus | null;
  progress: number;
  videoUrl: string | null;
  error: string | null;
};

const VIDEO_MODELS = [
  { value: "bytedance/seedance-1-pro", label: "Seedance 1 Pro" },
  { value: "bytedance/seedance-2.0", label: "Seedance 2.0" },
  { value: "kwaivgi/kling-v3-video", label: "Kling v3" },
  { value: "kwaivgi/kling-v2.5-turbo-pro", label: "Kling v2.5 Turbo" },
  { value: "minimax/video-01", label: "Minimax Video-01" },
  { value: "minimax/hailuo-02", label: "Hailuo 2" },
  { value: "wan-video/wan-2.5-t2v", label: "Wan 2.5" },
  { value: "wan-video/wan-2.2-t2v-fast", label: "Wan 2.2 Fast" },
  { value: "lightricks/ltx-video", label: "LTX Video" },
  { value: "google/veo-2", label: "Veo 2" },
  { value: "google/veo-3.1-lite", label: "Veo 3.1 Lite" },
  { value: "tencent/hunyuan-video", label: "Hunyuan Video" },
];

export default function VideoMakerPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [idea, setIdea] = useState("");
  const [styleHint, setStyleHint] = useState("");
  const [intensity, setIntensity] = useState<"subtle" | "balanced" | "dramatic">("balanced");

  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("bytedance/seedance-1-pro");
  const [size, setSize] = useState("1280x720");
  const [seconds, setSeconds] = useState("8");
  const [numOutputs, setNumOutputs] = useState(1);

  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  const [jobIds, setJobIds] = useState<string[]>([]);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<number | null>(null);

  const canSubmit = prompt.trim().length >= 5;

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        router.replace("/");
        return;
      }

      setCheckingAuth(false);
    }

    checkUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    const saved = localStorage.getItem("zenavant_prompt");
    if (saved) {
      setIdea(saved);
      setPrompt(saved);
      localStorage.removeItem("zenavant_prompt");
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  function stopPolling() {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function handleGeneratePrompt() {
    if (idea.trim().length < 5) {
      alert("Please describe your video idea first.");
      return;
    }

    setLoadingPrompt(true);

    try {
      const res = await fetch("/api/turn-thought-into-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringi
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const tools = [
  { title: "Image Maker", description: "Generate stunning images from text prompts using top AI models.", href: "/tools/image-maker", emoji: "🎨" },
  { title: "Video Maker", description: "Create beautiful videos from text prompts.", href: "/tools/video-maker", emoji: "🎬" },
  { title: "Image to Video", description: "Upload an image and bring it to life with motion.", href: "/tools/image-to-video", emoji: "✨" },
  { title: "Audio to Video", description: "Transform audio into a rich visual experience.", href: "/tools/audio-to-video", emoji: "🎵" },
  { title: "Lip Sync", description: "Sync lips to any audio with AI-powered precision.", href: "/tools/image-to-video-plus-lipsync", emoji: "🎤" },
  { title: "Thought to Prompt", description: "Turn a rough idea into a polished AI prompt.", href: "/tools/turn-thought-into-prompt", emoji: "💡" },
  { title: "Plan Tool", description: "Transform thoughts into clear, structured plans.", href: "/tools/turn-thought-into-plan", emoji: "📋" },
  { title: "Library", description: "View and manage all your generated media.", href: "/tools/library", emoji: "📚" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Wait briefly for session to hydrate before redirecting
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s2 } }) => {
            if (!s2) router.replace("/");
            else { setUserEmail(s2.user?.email ?? null); setChecked(true); }
          });
        }, 500);
      } else {
        setUserEmail(session.user?.email ?? null);
        setChecked(true);
      }
    });
  }, [router]);

  if (!checked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F2" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", color: "#C4714A" }}>Loading…</div>
      </div>
    );
  }

  const firstName = userEmail?.split("@")[0] ?? "there";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .zv-dash {
          min-height: 100vh;
          background: #FAF7F2;
          font-family: 'DM Sans', sans-serif;
          padding: 48px 24px 80px;
        }
        .zv-dash-inner { max-width: 1100px; margin: 0 auto; }

        .zv-dash-header { margin-bottom: 48px; }
        .zv-dash-greeting {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 300;
          color: #2C1F14;
          line-height: 1.15;
        }
        .zv-dash-greeting em { font-style: italic; color: #C4714A; }
        .zv-dash-sub {
          margin-top: 12px;
          font-size: 16px;
          font-weight: 300;
          color: #6B4F38;
        }

        .zv-tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .zv-tool-card {
          display: block;
          background: rgba(253, 249, 244, 0.9);
          border: 1px solid rgba(196, 113, 74, 0.15);
          border-radius: 20px;
          padding: 28px;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          box-shadow: 0 2px 16px rgba(44, 31, 20, 0.06);
        }
        .zv-tool-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 32px rgba(196, 113, 74, 0.15);
          border-color: rgba(196, 113, 74, 0.35);
        }

        .zv-tool-emoji {
          font-size: 32px;
          margin-bottom: 16px;
          display: block;
        }
        .zv-tool-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 600;
          color: #2C1F14;
          margin-bottom: 8px;
        }
        .zv-tool-desc {
          font-size: 14px;
          font-weight: 300;
          color: #6B4F38;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .zv-tool-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #C4714A;
          font-family: 'DM Sans', sans-serif;
        }
        .zv-tool-cta::after { content: '→'; transition: transform 0.2s; }
        .zv-tool-card:hover .zv-tool-cta::after { transform: translateX(4px); }

        @media (max-width: 640px) {
          .zv-dash { padding: 32px 16px 60px; }
          .zv-tools-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="zv-dash">
        <div className="zv-dash-inner">
          <div className="zv-dash-header">
            <h1 className="zv-dash-greeting">
              Good to see you,<br /><em>{firstName}.</em>
            </h1>
            <p className="zv-dash-sub">What would you like to create today?</p>
          </div>

          <div className="zv-tools-grid">
            {tools.map((tool) => (
              <Link key={tool.href} href={tool.href} className="zv-tool-card">
                <span className="zv-tool-emoji">{tool.emoji}</span>
                <div className="zv-tool-title">{tool.title}</div>
                <div className="zv-tool-desc">{tool.description}</div>
                <div className="zv-tool-cta">Open tool</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
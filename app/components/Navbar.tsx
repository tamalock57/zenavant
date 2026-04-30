"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tools/image-maker", label: "Image" },
  { href: "/tools/video-maker", label: "Video" },
  { href: "/tools/image-to-video", label: "Image to Video" },
  { href: "/tools/audio-to-video", label: "Audio to Video" },
  { href: "/tools/image-to-video-plus-lipsync", label: "Lip Sync" },
  { href: "/tools/turn-thought-into-prompt", label: "Thought to Prompt" },
  { href: "/tools/turn-thought-into-plan", label: "Plan" },
  { href: "/tools/library", label: "Library" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname === "/") return null;

  async function handleLogout() {
  await supabase.auth.signOut();
  window.location.href = "/";
  }

  return (
    <>
      <style>{`
        .zv-nav {
          width: 100%;
          background: rgba(250, 247, 242, 0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(196, 113, 74, 0.12);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .zv-nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .zv-nav-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          font-weight: 600;
          color: #2C1F14;
          text-decoration: none;
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }
        .zv-nav-logo span { color: #C4714A; }

        .zv-nav-links {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: nowrap;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .zv-nav-links::-webkit-scrollbar { display: none; }

        .zv-nav-link {
          padding: 7px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          color: #6B4F38;
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .zv-nav-link:hover {
          background: rgba(196, 113, 74, 0.08);
          color: #C4714A;
        }
        .zv-nav-link.active {
          background: #C4714A;
          color: white;
        }
        .zv-nav-logout {
          padding: 7px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          color: #6B4F38;
          border: 1.5px solid rgba(196, 113, 74, 0.3);
          background: transparent;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
          flex-shrink: 0;
          margin-left: 8px;
        }
        .zv-nav-logout:hover {
          background: #C4714A;
          color: white;
          border-color: #C4714A;
        }

        .zv-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        .zv-hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          background: #6B4F38;
          border-radius: 2px;
          transition: all 0.2s;
        }

        .zv-mobile-menu {
          display: none;
          flex-direction: column;
          gap: 4px;
          padding: 12px 24px 20px;
          border-top: 1px solid rgba(196, 113, 74, 0.1);
          background: rgba(250, 247, 242, 0.97);
        }
        .zv-mobile-menu.open { display: flex; }

        .zv-mobile-link {
          padding: 11px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: #6B4F38;
          text-decoration: none;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .zv-mobile-link:hover { background: rgba(196,113,74,0.08); color: #C4714A; }
        .zv-mobile-link.active { background: #C4714A; color: white; }

        .zv-mobile-logout {
          margin-top: 8px;
          padding: 11px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: #A85A36;
          background: rgba(196,113,74,0.08);
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .zv-mobile-logout:hover { background: #C4714A; color: white; }

        @media (max-width: 900px) {
          .zv-nav-links { display: none; }
          .zv-nav-logout { display: none; }
          .zv-hamburger { display: flex; }
        }
      `}</style>

      <nav className="zv-nav">
        <div className="zv-nav-inner">
          <Link href="/dashboard" className="zv-nav-logo">
            Zen<span>avant</span>
          </Link>

          <div className="zv-nav-links">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`zv-nav-link${pathname === item.href ? " active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <button className="zv-nav-logout" onClick={handleLogout}>
            Logout
          </button>

          <button className="zv-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className={`zv-mobile-menu${menuOpen ? " open" : ""}`}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`zv-mobile-link${pathname === item.href ? " active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <button className="zv-mobile-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>
    </>
  );
}
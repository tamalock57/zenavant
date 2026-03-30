"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const links = [
  { href: "/dashboard", label: "Plan" },
  { href: "/tools/image-maker", label: "Image" },
  { href: "/tools/video-maker", label: "Video" },
  { href: "/tools/image-to-video", label: "Image→Video" },
  { href: "/tools/audio-to-video", label: "Audio→Video" },
  { href: "/tools/library", label: "Library" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#111",
        color: "#fff",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
            marginRight: 8,
          }}
        >
          Zenavant
        </Link>

        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: "#fff",
                textDecoration: "none",
                padding: "8px 12px",
                borderRadius: 10,
                background: active ? "rgba(255,255,255,0.18)" : "transparent",
                transition: "all 0.2s ease",
                fontWeight: active ? 700 : 500,
                fontSize: 15,
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <button
        onClick={handleSignOut}
        style={{
          padding: "10px 14px",
          fontSize: 16,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "#fff",
          color: "#111",
          cursor: "pointer",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        Sign out
      </button>
    </div>
  );
}


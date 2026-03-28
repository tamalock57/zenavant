"use client";

import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function getLinkStyle(active: boolean): React.CSSProperties {
    return {
      padding: "6px 10px",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 14,
      color: "#fff",
      opacity: active ? 1 : 0.78,
      background: active ? "rgba(255,255,255,0.14)" : "transparent",
      fontWeight: active ? 700 : 500,
    };
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
        padding: "12px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          cursor: "pointer",
          color: "#fff",
        }}
        onClick={() => router.push("/")}
      >
        Zenavant
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={getLinkStyle(pathname === "/tools/turn-thought-into-plan")}
          onClick={() => router.push("/tools/turn-thought-into-plan")}
        >
          Plan
        </div>

        <div
          style={getLinkStyle(pathname === "/tools/image-maker")}
          onClick={() => router.push("/tools/image-maker")}
        >
          Image
        </div>

        <div
          style={getLinkStyle(pathname === "/tools/video-maker")}
          onClick={() => router.push("/tools/video-maker")}
        >
          Video
        </div>

        <div
          style={getLinkStyle(pathname === "/tools/library")}
          onClick={() => router.push("/tools/library")}
        >
          Library
        </div>

        <button
          onClick={handleSignOut}
          style={{
            background: "#fff",
            color: "#111",
            borderRadius: 8,
            padding: "8px 12px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
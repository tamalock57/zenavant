"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const linkStyle: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    opacity: 0.9,
    color: "#fff"
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#111",
        color: "#fff"
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "12px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          cursor: "pointer",
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
        }}
      >
        <div style={linkStyle} onClick={() => router.push("/tools/turn-thought-into-plan")}>
          Plan
        </div>

        <div style={linkStyle} onClick={() => router.push("/tools/image-maker")}>
          Image
        </div>

        <div style={linkStyle} onClick={() => router.push("/tools/video-maker")}>
          Video
        </div>

        <div style={linkStyle} onClick={() => router.push("/tools/library")}>
          Library
        </div>

        <div
          style={{
            ...linkStyle,
            background: "#111",
            color: "#fff",
            opacity: 1,
          }}
          onClick={handleSignOut}
        >

        <button
         style={{
           background: "#fff",
           color: "#111",
           borderRadius: 8,
           padding: "6px 12px",
           fontWeight: 500,
         }}
         >
          Sign out
        </button>
        </div>
      </div>
    </div>
  );
}
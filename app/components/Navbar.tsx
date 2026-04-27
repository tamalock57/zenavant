"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

  // Hide navbar on login page
  if (pathname === "/") {
    return null;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <nav className="w-full border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/dashboard"
          className="text-2xl font-semibold text-black"
        >
          Zenavant
        </Link>

        <div className="flex flex-wrap gap-3">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-2xl px-5 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-black text-white"
                    : "bg-neutral-100 text-black hover:bg-neutral-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            className="rounded-2xl bg-neutral-800 px-5 py-3 text-sm font-medium text-white hover:bg-black"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
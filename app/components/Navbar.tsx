"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tools/image-maker", label: "Image" },
  { href: "/tools/video-maker", label: "Video" },
  { href: "/tools/image-to-video", label: "Image to Video" },
  { href: "/tools/turn-thought-into-prompt", label: "Thought to Prompt",},
  { href: "/tools/turn-thought-into-plan", label: "Plan" },
  { href: "/tools/library", label: "Library" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/dashboard"
          className="text-xl font-semibold tracking-tight text-black"
        >
          Zenavant
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

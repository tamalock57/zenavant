"use client";

import Link from "next/link";

const tools = [
  {
    title: "Image Maker",
    description: "Generate images from text prompts.",
    href: "/tools/image-maker",
  },
  {
    title: "Video Maker",
    description: "Create videos from prompts or media.",
    href: "/tools/video-maker",
  },
  {
    title: "Plan Tool",
    description: "Turn thoughts into structured plans.",
    href: "/tools/turn-thought-into-plan",
  },
  {
    title: "Library",
    description: "View and manage your generated media.",
    href: "/tools/library",
  },
];

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-semibold">Dashboard</h1>
        <p className="mt-3 text-gray-600">
          Choose a tool and start creating.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link key={tool.title} href={tool.href}>
            <div className="cursor-pointer rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md hover:scale-[1.02]">
              <h2 className="text-xl font-semibold">{tool.title}</h2>
              <p className="mt-2 text-sm text-gray-600">
                {tool.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
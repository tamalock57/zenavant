"use client";

import Link from "next/link";

const tools = [
  {
    title: "Image Maker",
    description: "Generate images from text prompts.",
    href: "/tools/image-maker",
    cta: "Open Image Maker",
  },
  {
    title: "Video Maker",
    description: "Create videos from prompts or media.",
    href: "/tools/video-maker",
    cta: "Open Video Maker",
  },
  {
    title: "Plan Tool",
    description: "Turn thoughts into structured plans.",
    href: "/tools/turn-thought-into-plan",
    cta: "Open Plan Tool",
  },
  {
    title: "Library",
    description: "View and manage your generated media.",
    href: "/tools/library",
    cta: "Open Library",
  },
];

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-3 text-base text-gray-600">
          Choose a tool and start creating.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link key={tool.title} href={tool.href} className="block">
            <div className="rounded-3xl border bg-white p-5 shadow-sm transition active:scale-[0.99] sm:hover:shadow-md">
              <div className="flex min-h-[148px] flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-black">
                    {tool.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-5">
                  <span className="inline-flex rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white">
                    {tool.cta}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
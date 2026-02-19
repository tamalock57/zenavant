"use client";

import { useParams } from "next/navigation";

export default function ProjectPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-2xl">
        <a href="/dashboard" className="text-sm underline">
          ← Back
        </a>

        <div className="mt-6 border rounded p-6">
          <h1 className="text-3xl font-semibold">
            Project ID: {id}
          </h1>
          <p className="text-neutral-500 mt-2">
            Generation will live here next.
          </p>
        </div>
      </div>
    </main>
  );
}
